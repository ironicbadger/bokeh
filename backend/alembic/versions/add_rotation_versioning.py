"""Add rotation versioning fields

Revision ID: add_rotation_versioning
Revises: 
Create Date: 2024-01-15

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_rotation_versioning'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Add rotation_version for cache busting
    op.add_column('photos', sa.Column('rotation_version', sa.Integer(), nullable=False, server_default='0'))
    
    # Add final_rotation for combined EXIF + user rotation
    op.add_column('photos', sa.Column('final_rotation', sa.Integer(), nullable=False, server_default='0'))
    
    # Update final_rotation for existing photos
    op.execute("""
        UPDATE photos 
        SET final_rotation = (COALESCE(rotation_applied, 0) + COALESCE(user_rotation, 0)) % 360
    """)


def downgrade():
    op.drop_column('photos', 'rotation_version')
    op.drop_column('photos', 'final_rotation')