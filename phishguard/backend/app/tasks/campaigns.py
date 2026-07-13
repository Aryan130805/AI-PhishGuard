import logging
import re
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from app.tasks.celery_app import celery_app
from app.database import SessionLocal
from app.models.department import Department
from app.models.campaign import EmailTemplate, Campaign, CampaignStatus, CampaignTarget, EmailEvent, EmailEventType
from app.models.user import User
from app.services.ai_generator import AIGeneratorService
from app.services.cache import CacheService
from app.config import settings
from app.models.risk import UserMetrics

logger = logging.getLogger("phishguard")

@celery_app.task(name="app.tasks.campaigns.generate_email_task")
def generate_email_task(
    department_id: Optional[int],
    difficulty: str,
    theme: str,
    language: str,
    tone: str
) -> dict:
    logger.info(f"Starting email template generation: difficulty={difficulty}, theme={theme}, language={language}")
    
    cache_service = CacheService()
    cache_key = cache_service.make_key(department_id, difficulty, theme, language)
    
    # 1. Check Cache
    cached_data = cache_service.get(cache_key)
    if cached_data:
        logger.info("Found generated template in cache.")
        db = SessionLocal()
        try:
            template = EmailTemplate(
                subject=cached_data["subject"],
                sender_name=cached_data["sender_name"],
                sender_email=cached_data["sender_email"],
                body_html=cached_data["body_html"],
                cta_text=cached_data["cta_text"],
                fake_url=cached_data["fake_url_path"],
                ai_generated=True,
                approved=False
            )
            db.add(template)
            db.commit()
            db.refresh(template)
            
            result = cached_data.copy()
            result["template_id"] = template.id
            return result
        except Exception as db_err:
            db.rollback()
            logger.error(f"Database error saving cached template: {str(db_err)}")
            raise db_err
        finally:
            db.close()

    # 2. Query Department Name
    department_name = "General Audience"
    db = SessionLocal()
    try:
        if department_id is not None:
            dept = db.query(Department).filter(Department.id == department_id).first()
            if dept:
                department_name = dept.name
    except Exception as db_err:
        logger.warning(f"Error querying department {department_id}: {str(db_err)}")
    finally:
        db.close()

    # 3. Call AI Service
    ai_service = AIGeneratorService()
    try:
        ai_response = ai_service.generate_email(
            theme=theme,
            difficulty=difficulty,
            language=language,
            department_name=department_name,
            tone=tone
        )
    except Exception as e:
        logger.error(f"AI Generation failed: {str(e)}")
        raise e

    # 4. Save to Database
    db = SessionLocal()
    try:
        template = EmailTemplate(
            subject=ai_response.subject,
            sender_name=ai_response.sender_name,
            sender_email=ai_response.sender_email,
            body_html=ai_response.body_html,
            cta_text=ai_response.cta_text,
            fake_url=ai_response.fake_url_path,
            ai_generated=True,
            approved=False
        )
        db.add(template)
        db.commit()
        db.refresh(template)
        
        # 5. Populate Cache
        response_dict = ai_response.model_dump()
        cache_service.set(cache_key, response_dict)
        
        result = response_dict.copy()
        result["template_id"] = template.id
        return result
    except Exception as db_err:
        db.rollback()
        logger.error(f"Database error saving template: {str(db_err)}")
        raise db_err
    finally:
        db.close()

@celery_app.task(name="app.tasks.campaigns.check_scheduled_campaigns")
def check_scheduled_campaigns() -> int:
    from datetime import datetime, timezone
    db = SessionLocal()
    count = 0
    try:
        now = datetime.now(timezone.utc)
        scheduled_campaigns = db.query(Campaign).filter(Campaign.status == CampaignStatus.scheduled).all()
        for campaign in scheduled_campaigns:
            if campaign.scheduled_at:
                c_time = campaign.scheduled_at
                if c_time.tzinfo is None:
                    c_time = c_time.replace(tzinfo=timezone.utc)
                if c_time <= now:
                    logger.info(f"Transitioning campaign '{campaign.name}' (ID={campaign.id}) from scheduled -> running")
                    campaign.status = CampaignStatus.running
                    db.commit()
                    count += 1
                    
                    targets = db.query(CampaignTarget).filter(CampaignTarget.campaign_id == campaign.id).all()
                    for target in targets:
                        send_campaign_email_task.delay(campaign.id, target.id)
                        
    except Exception as e:
        logger.error(f"Error checking scheduled campaigns: {str(e)}")
    finally:
        db.close()
    return count

@celery_app.task(name="app.tasks.campaigns.send_campaign_email_task")
def send_campaign_email_task(campaign_id: int, target_id: int) -> bool:
    db = SessionLocal()
    try:
        target = db.query(CampaignTarget).filter(CampaignTarget.id == target_id).first()
        if not target:
            logger.error(f"CampaignTarget ID {target_id} not found")
            return False
            
        user = db.query(User).filter(User.id == target.user_id).first()
        if not user:
            logger.error(f"User ID {target.user_id} not found for target {target_id}")
            return False
            
        template = db.query(EmailTemplate).filter(EmailTemplate.campaign_id == campaign_id).first()
        if not template:
            logger.error(f"No template found for campaign {campaign_id}")
            return False
            
        # 1. Rewrite CTA link
        click_url = f"http://localhost:8000/track/click/{target.tracking_token}"
        body_html = template.body_html
        if template.fake_url in body_html:
            body_html = body_html.replace(template.fake_url, click_url)
        else:
            body_html = re.sub(r'href=["\'][^"\']*["\']', f'href="{click_url}"', body_html)
            
        # 2. Embed pixel
        open_url = f"http://localhost:8000/track/open/{target.tracking_token}"
        pixel_tag = f'<img src="{open_url}" width="1" height="1" style="display:none;" alt="" />'
        body_html += pixel_tag
        
        # 3. SMTP Sending
        logger.info(f"Sending simulated phishing email to {user.email} (token={target.tracking_token})")
        msg = MIMEMultipart("alternative")
        msg["Subject"] = template.subject
        msg["From"] = f"{template.sender_name} <{template.sender_email}>"
        msg["To"] = user.email
        
        part = MIMEText(body_html, "html")
        msg.attach(part)
        
        try:
            if settings.SMTP_SECURE:
                server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10.0)
            else:
                server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10.0)
                
            if not settings.SMTP_SECURE and settings.SMTP_PORT != 1025:
                try:
                    server.starttls()
                except Exception:
                    pass
                    
            if settings.SMTP_USER and settings.SMTP_PASSWORD:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                
            server.sendmail(template.sender_email, [user.email], msg.as_string())
            server.quit()
            logger.info(f"Successfully delivered email via SMTP to {user.email}")
        except Exception as smtp_err:
            logger.error(f"SMTP transport delivery failed: {str(smtp_err)}")
            
        # 4. Log "sent" event
        event = EmailEvent(
            campaign_id=campaign_id,
            user_id=target.user_id,
            event_type=EmailEventType.sent
        )
        db.add(event)
        db.commit()
        return True
    except Exception as e:
        logger.error(f"Error in send_campaign_email_task: {str(e)}")
        return False
    finally:
        db.close()

@celery_app.task(name="app.tasks.campaigns.check_ignored_and_complete_campaigns")
def check_ignored_and_complete_campaigns() -> int:
    from datetime import datetime, timezone, timedelta
    db = SessionLocal()
    completed_count = 0
    try:
        now = datetime.now(timezone.utc)
        running_campaigns = db.query(Campaign).filter(Campaign.status == CampaignStatus.running).all()
        for campaign in running_campaigns:
            start_time = campaign.scheduled_at or campaign.created_at
            if start_time.tzinfo is None:
                start_time = start_time.replace(tzinfo=timezone.utc)
                
            is_past_5_days = (now - start_time) >= timedelta(days=5)
            is_past_7_days = (now - start_time) >= timedelta(days=7)
            
            targets = db.query(CampaignTarget).filter(CampaignTarget.campaign_id == campaign.id).all()
            all_terminal = True
            
            for target in targets:
                terminal_event = db.query(EmailEvent).filter(
                    EmailEvent.campaign_id == campaign.id,
                    EmailEvent.user_id == target.user_id,
                    EmailEvent.event_type.in_([
                        EmailEventType.reported,
                        EmailEventType.credentials_submitted,
                        EmailEventType.ignored
                    ])
                ).first()
                
                if not terminal_event:
                    if is_past_5_days:
                        ignored_event = EmailEvent(
                            campaign_id=campaign.id,
                            user_id=target.user_id,
                            event_type=EmailEventType.ignored
                        )
                        db.add(ignored_event)
                        db.commit()
                    else:
                        all_terminal = False
                        
            if all_terminal or is_past_7_days:
                logger.info(f"Transitioning campaign '{campaign.name}' (ID={campaign.id}) to completed status")
                campaign.status = CampaignStatus.completed
                db.commit()
                completed_count += 1
                
                # Notify admin creator of campaign completion
                if campaign.created_by:
                    try:
                        from app.services.notification_service import create_notification
                        create_notification(
                            db=db,
                            user_id=campaign.created_by,
                            notif_type="campaign_completed",
                            payload={
                                "message": f"Campaign '{campaign.name}' has completed successfully. All targets have been processed.",
                                "link": "/admin/campaigns"
                            }
                        )
                    except Exception as notif_err:
                        logger.error(f"Failed to create campaign_completed notification: {str(notif_err)}")

                for target in targets:
                    recompute_user_risk_score.delay(target.user_id)
                
    except Exception as e:
        logger.error(f"Error in check_ignored_and_complete_campaigns task: {str(e)}")
    finally:
        db.close()
    return completed_count

@celery_app.task(name="app.tasks.campaigns.recompute_all_user_metrics")
def recompute_all_user_metrics() -> int:
    db = SessionLocal()
    recomputed_count = 0
    try:
        users = db.query(User).all()
        for user in users:
            total_targeted = db.query(CampaignTarget).filter(CampaignTarget.user_id == user.id).count()
            
            if total_targeted == 0:
                click_rate = 0.0
                report_rate = 0.0
                open_rate = 0.0
                avg_time_to_click = 0.0
            else:
                clicks = db.query(EmailEvent.campaign_id).filter(
                    EmailEvent.user_id == user.id,
                    EmailEvent.event_type == EmailEventType.clicked
                ).distinct().count()
                
                opens = db.query(EmailEvent.campaign_id).filter(
                    EmailEvent.user_id == user.id,
                    EmailEvent.event_type == EmailEventType.opened
                ).distinct().count()
                
                reports = db.query(EmailEvent.campaign_id).filter(
                    EmailEvent.user_id == user.id,
                    EmailEvent.event_type == EmailEventType.reported
                ).distinct().count()
                
                click_rate = clicks / total_targeted
                open_rate = opens / total_targeted
                report_rate = reports / total_targeted
                
                sent_events = db.query(EmailEvent).filter(
                    EmailEvent.user_id == user.id,
                    EmailEvent.event_type == EmailEventType.sent
                ).all()
                sent_map = {e.campaign_id: e.occurred_at for e in sent_events}
                
                click_events = db.query(EmailEvent).filter(
                    EmailEvent.user_id == user.id,
                    EmailEvent.event_type == EmailEventType.clicked
                ).all()
                
                click_map = {}
                for c in click_events:
                    if c.campaign_id not in click_map or c.occurred_at < click_map[c.campaign_id]:
                        click_map[c.campaign_id] = c.occurred_at
                        
                total_seconds = 0.0
                count_clicks = 0
                for campaign_id, click_time in click_map.items():
                    if campaign_id in sent_map:
                        sent_time = sent_map[campaign_id]
                        s_time = sent_time.replace(tzinfo=None) if sent_time.tzinfo else sent_time
                        c_time = click_time.replace(tzinfo=None) if click_time.tzinfo else click_time
                        diff = (c_time - s_time).total_seconds()
                        if diff >= 0:
                            total_seconds += diff
                            count_clicks += 1
                            
                avg_time_to_click = total_seconds / count_clicks if count_clicks > 0 else 0.0
                
            metrics = db.query(UserMetrics).filter(UserMetrics.user_id == user.id).first()
            if not metrics:
                metrics = UserMetrics(user_id=user.id)
                db.add(metrics)
                
            metrics.click_rate = click_rate
            metrics.open_rate = open_rate
            metrics.report_rate = report_rate
            metrics.avg_time_to_click = avg_time_to_click
            db.commit()
            recomputed_count += 1
            
    except Exception as e:
        logger.error(f"Error in recompute_all_user_metrics: {str(e)}")
    finally:
        db.close()
    return recomputed_count

@celery_app.task(name="app.tasks.campaigns.recompute_user_risk_score")
def recompute_user_risk_score(user_id: int) -> float:
    db = SessionLocal()
    try:
        from datetime import datetime, timezone
        from app.models.user import User
        from app.models.risk import UserMetrics, RiskScore
        from app.models.learning import Lesson, QuizAttempt, Certificate
        from app.services.risk_engine import compute_risk_score
        
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            logger.error(f"User {user_id} not found for risk score computation")
            return 0.0
            
        total_targeted = db.query(CampaignTarget).filter(CampaignTarget.user_id == user_id).count()
        
        if total_targeted == 0:
            click_rate = 0.0
            report_rate = 0.0
            open_rate = 0.0
            avg_time_to_click = 0.0
        else:
            clicks = db.query(EmailEvent.campaign_id).filter(
                EmailEvent.user_id == user_id,
                EmailEvent.event_type == EmailEventType.clicked
            ).distinct().count()
            
            opens = db.query(EmailEvent.campaign_id).filter(
                EmailEvent.user_id == user_id,
                EmailEvent.event_type == EmailEventType.opened
            ).distinct().count()
            
            reports = db.query(EmailEvent.campaign_id).filter(
                EmailEvent.user_id == user_id,
                EmailEvent.event_type == EmailEventType.reported
            ).distinct().count()
            
            click_rate = clicks / total_targeted
            open_rate = opens / total_targeted
            report_rate = reports / total_targeted
            
            sent_events = db.query(EmailEvent).filter(
                EmailEvent.user_id == user_id,
                EmailEvent.event_type == EmailEventType.sent
            ).all()
            sent_map = {e.campaign_id: e.occurred_at for e in sent_events}
            
            click_events = db.query(EmailEvent).filter(
                EmailEvent.user_id == user_id,
                EmailEvent.event_type == EmailEventType.clicked
            ).all()
            
            click_map = {}
            for c in click_events:
                if c.campaign_id not in click_map or c.occurred_at < click_map[c.campaign_id]:
                    click_map[c.campaign_id] = c.occurred_at
                    
            total_seconds = 0.0
            count_clicks = 0
            for campaign_id, click_time in click_map.items():
                if campaign_id in sent_map:
                    sent_time = sent_map[campaign_id]
                    s_time = sent_time.replace(tzinfo=None) if sent_time.tzinfo else sent_time
                    c_time = click_time.replace(tzinfo=None) if click_time.tzinfo else click_time
                    diff = (c_time - s_time).total_seconds()
                    if diff >= 0:
                        total_seconds += diff
                        count_clicks += 1
                        
            avg_time_to_click = total_seconds / count_clicks if count_clicks > 0 else 0.0
            
        metrics = db.query(UserMetrics).filter(UserMetrics.user_id == user_id).first()
        if not metrics:
            metrics = UserMetrics(user_id=user_id)
            db.add(metrics)
            
        metrics.click_rate = click_rate
        metrics.open_rate = open_rate
        metrics.report_rate = report_rate
        metrics.avg_time_to_click = avg_time_to_click
        db.commit()
        
        passed_attempts = db.query(QuizAttempt).filter(QuizAttempt.user_id == user_id, QuizAttempt.passed == True).all()
        quiz_score = sum(a.score for a in passed_attempts) / len(passed_attempts) / 100.0 if passed_attempts else 0.0
        
        total_lessons = db.query(Lesson).count()
        completed_lessons = db.query(Certificate).filter(Certificate.user_id == user_id).count()
        learning_progress = completed_lessons / total_lessons if total_lessons > 0 else 0.0
        
        latest_risk = db.query(RiskScore).filter(RiskScore.user_id == user_id).order_by(RiskScore.computed_at.desc()).first()
        prev_score = latest_risk.score if latest_risk else 100.0
        
        new_score = compute_risk_score(click_rate, quiz_score, report_rate, learning_progress, prev_score)
        
        new_risk_row = RiskScore(
            user_id=user_id,
            score=new_score,
            computed_at=datetime.now(timezone.utc)
        )
        db.add(new_risk_row)
        db.commit()
        
        if new_score < 50.0:
            trigger_advanced_training_alert.delay(user_id, new_score)
            
        return new_score
    except Exception as e:
        logger.error(f"Error in recompute_user_risk_score task: {str(e)}")
        return 0.0
    finally:
        db.close()

@celery_app.task(name="app.tasks.campaigns.trigger_advanced_training_alert")
def trigger_advanced_training_alert(user_id: int, score: float):
    db = SessionLocal()
    try:
        from app.models.user import User
        from app.models.role import Role
        from app.services.notification_service import create_notification
        
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            user.needs_advanced_training = True
            db.commit()
            logger.info(f"User {user.email} (ID: {user_id}) flagged for advanced training due to risk score {score:.2f}")
            
            # 1. Notify the affected employee
            try:
                create_notification(
                    db=db,
                    user_id=user_id,
                    notif_type="high_risk_score",
                    payload={
                        "message": f"Your current risk score is {score:.2f}, which is below the threshold of 50. Please review assigned training lessons.",
                        "link": "/employee/training"
                    }
                )
            except Exception as e:
                logger.error(f"Failed to create high_risk_score employee notification: {str(e)}")
                
            # 2. Notify all admin users
            try:
                admins = db.query(User).join(Role).filter(Role.name == "admin").all()
                for admin in admins:
                    create_notification(
                        db=db,
                        user_id=admin.id,
                        notif_type="high_risk_score",
                        payload={
                            "message": f"User '{user.email}' has a high risk score of {score:.2f} (below 50). They have been flagged for advanced training.",
                            "link": "/admin/analytics"
                        }
                    )
            except Exception as e:
                logger.error(f"Failed to create high_risk_score admin notifications: {str(e)}")
    except Exception as e:
        logger.error(f"Error in trigger_advanced_training_alert task: {str(e)}")
    finally:
        db.close()

@celery_app.task(name="app.tasks.campaigns.process_mistake_event")
def process_mistake_event(user_id: int, campaign_id: int):
    db = SessionLocal()
    try:
        from app.models.campaign import Campaign, CampaignTarget, EmailEvent, EmailEventType
        from app.models.learning import Lesson, Quiz, LessonAssignment
        from app.data.theme_to_lesson_topic import THEME_TO_LESSON_TOPIC
        from app.services.ai_generator import AIGeneratorService
        
        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if not campaign:
            logger.error(f"Campaign {campaign_id} not found in process_mistake_event")
            return
            
        theme = campaign.theme
        topic = THEME_TO_LESSON_TOPIC.get(theme)
        if not topic:
            logger.warning(f"No deterministic lesson topic mapping for campaign theme: {theme}")
            return
            
        lesson = db.query(Lesson).filter(Lesson.topic == topic).first()
        if not lesson:
            logger.info(f"Generating new lesson for topic: {topic} via AI generator")
            ai_service = AIGeneratorService()
            ai_lesson = ai_service.generate_lesson(topic)
            
            lesson = Lesson(
                topic=topic,
                title=ai_lesson.title,
                content=ai_lesson.content_html,
                ai_generated=True
            )
            db.add(lesson)
            db.commit()
            db.refresh(lesson)
            
            serialized_quiz_questions = [
                {
                    "question": q.question,
                    "options": q.options,
                    "correct_index": q.correct_index
                }
                for q in ai_lesson.quiz
            ]
            
            quiz = Quiz(
                lesson_id=lesson.id,
                questions=serialized_quiz_questions
            )
            db.add(quiz)
            db.commit()
            
        existing_assignment = db.query(LessonAssignment).filter(
            LessonAssignment.user_id == user_id,
            LessonAssignment.lesson_id == lesson.id
        ).first()
        
        if not existing_assignment:
            logger.info(f"Assigning lesson {lesson.title} (ID: {lesson.id}) to User {user_id}")
            assignment = LessonAssignment(
                user_id=user_id,
                lesson_id=lesson.id
            )
            db.add(assignment)
            db.commit()
            
            try:
                from app.services.notification_service import create_notification
                create_notification(
                    db=db,
                    user_id=user_id,
                    notif_type="lesson_assigned",
                    payload={
                        "message": f"A new training lesson has been assigned to you: '{lesson.title}'. Please complete it as soon as possible.",
                        "link": "/employee/training"
                    }
                )
            except Exception as notif_err:
                logger.error(f"Failed to create lesson_assigned notification: {str(notif_err)}")
            
    except Exception as e:
        logger.error(f"Error in process_mistake_event task: {str(e)}")
    finally:
        db.close()

