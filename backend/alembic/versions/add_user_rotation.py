"""Add user_rotation column to photos table

Revision ID: add_user_rotation
Revises: 
Create Date: 2025-01-15

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_user_rotation'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Add user_rotation column to photos table
    op.add_column('photos', sa.Column('user_rotation', sa.Integer(), nullable=True, server_default='0'))
    
    # Update existing rows to have 0 as default
    op.execute("UPDATE photos SET user_rotation = 0 WHERE user_rotation IS NULL")


def downgrade():
    # Remove user_rotation column
    op.drop_column('photos', 'user_rotation')