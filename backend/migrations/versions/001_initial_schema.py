"""Initial database schema for CodeGuard AI

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-10-25 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '001_initial_schema'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Users table
    op.create_table(
        'users',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('email', sa.String(length=255), nullable=False, unique=True),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('role', sa.String(length=50), nullable=False, server_default='developer'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('preferences', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False)
    )
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)

    # Reviews table
    op.create_table(
        'reviews',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('language', sa.String(length=50), nullable=False),
        sa.Column('source_code', sa.Text(), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='pending'),
        sa.Column('analysis_summary', sa.Text(), nullable=True),
        sa.Column('quality_score', sa.Float(), nullable=False, server_default='100.0'),
        sa.Column('metrics', sa.JSON(), nullable=False),
        sa.Column('ai_used', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('ai_status', sa.String(length=50), nullable=False, server_default='unconfigured'),
        sa.Column('ai_notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True)
    )
    op.create_index(op.f('ix_reviews_id'), 'reviews', ['id'], unique=False)
    op.create_index(op.f('ix_reviews_user_id'), 'reviews', ['user_id'], unique=False)
    op.create_index(op.f('ix_reviews_language'), 'reviews', ['language'], unique=False)
    op.create_index(op.f('ix_reviews_created_at'), 'reviews', ['created_at'], unique=False)

    # Findings table
    op.create_table(
        'findings',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('review_id', sa.String(length=36), sa.ForeignKey('reviews.id', ondelete='CASCADE'), nullable=False),
        sa.Column('rule_id', sa.String(length=50), nullable=False, server_default='CUSTOM-001'),
        sa.Column('category', sa.String(length=50), nullable=False),
        sa.Column('severity', sa.String(length=50), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('why_it_matters', sa.Text(), nullable=True),
        sa.Column('file_path', sa.String(length=255), nullable=False, server_default='main'),
        sa.Column('start_line', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('end_line', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('source', sa.String(length=50), nullable=False, server_default='static_analyzer'),
        sa.Column('confidence', sa.Float(), nullable=False, server_default='0.9'),
        sa.Column('suggested_fix', sa.Text(), nullable=True),
        sa.Column('suggested_code', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='open'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False)
    )
    op.create_index(op.f('ix_findings_id'), 'findings', ['id'], unique=False)
    op.create_index(op.f('ix_findings_review_id'), 'findings', ['review_id'], unique=False)
    op.create_index(op.f('ix_findings_category'), 'findings', ['category'], unique=False)
    op.create_index(op.f('ix_findings_severity'), 'findings', ['severity'], unique=False)
    op.create_index(op.f('ix_findings_status'), 'findings', ['status'], unique=False)

def downgrade() -> None:
    op.drop_table('findings')
    op.drop_table('reviews')
    op.drop_table('users')
