"""add_report_job_fields

Revision ID: a1b2c3d4e5f6
Revises: 9c29434ecf62
Create Date: 2026-07-12 04:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '9c29434ecf62'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

JSON_TYPE = sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), 'postgresql')


def upgrade() -> None:
    # Add columns and constraint inside batch block
    with op.batch_alter_table('reports') as batch_op:
        batch_op.add_column(sa.Column('job_id', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('status', sa.String(), nullable=False, server_default='pending'))
        batch_op.add_column(sa.Column('error_message', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('date_from', sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column('date_to', sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column('department_id', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('formats', JSON_TYPE, nullable=True))
        batch_op.add_column(sa.Column('file_paths', JSON_TYPE, nullable=True))
        batch_op.alter_column('file_path', nullable=True)
        batch_op.create_foreign_key(
            'fk_reports_department_id',
            'departments',
            ['department_id'], ['id'],
            ondelete='SET NULL'
        )

    # Create unique index on job_id
    op.create_index(op.f('ix_reports_job_id'), 'reports', ['job_id'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_reports_job_id'), table_name='reports')
    with op.batch_alter_table('reports') as batch_op:
        batch_op.drop_constraint('fk_reports_department_id', type_='foreignkey')
        batch_op.drop_column('file_paths')
        batch_op.drop_column('formats')
        batch_op.drop_column('department_id')
        batch_op.drop_column('date_to')
        batch_op.drop_column('date_from')
        batch_op.drop_column('error_message')
        batch_op.drop_column('status')
        batch_op.drop_column('job_id')
