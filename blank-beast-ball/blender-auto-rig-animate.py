#!/usr/bin/env blender --python
"""
Blender Auto-Rigging and Animation Script for Blank Beast Ball Characters

This script:
1. Imports GLB models
2. Auto-rigs them using Rigify or a simple armature
3. Creates idle and run animations
4. Exports as separate GLB files with animations

Usage:
    blender --background --python blender-auto-rig-animate.py -- <model_path> <output_dir>

Or batch process:
    blender --background --python blender-auto-rig-animate.py -- --batch
"""

import bpy
import os
import sys
import math
from mathutils import Vector, Euler

# Get script arguments (after the --)
argv = sys.argv
argv = argv[argv.index("--") + 1:] if "--" in argv else []

# Configuration
# Configuration
MODELS_DIR = "/Users/gabrielgreenstein/Blank_Wars_2026/blank-beast-ball/models"
OUTPUT_DIR = "/Users/gabrielgreenstein/Blank_Wars_2026/blank-beast-ball/models"

# Characters to process
CHARACTERS = [
    # Humanoid characters
    {'name': 'tesla', 'type': 'humanoid'},
    {'name': 'fenrir', 'type': 'humanoid'},
    {'name': 'holmes', 'type': 'humanoid', 'animations': ['idle']},  # Only needs idle

    # Quadruped animals
    {'name': 'cow', 'type': 'quadruped'},
    {'name': 'rhino', 'type': 'quadruped'},
    {'name': 'polar_bear', 'type': 'quadruped'},

    # Birds
    {'name': 'eagle', 'type': 'bird'},
    {'name': 'flamingo', 'type': 'bird'},
    {'name': 'penguin', 'type': 'bird'},

    # Other animals
    {'name': 'alligator', 'type': 'reptile'},
    {'name': 'snake', 'type': 'snake'},
    {'name': 'walrus', 'type': 'quadruped'},
    {'name': 'starfish', 'type': 'special'},
]


def clear_scene():
    """Remove all objects from the scene"""
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)


def import_glb(filepath):
    """Import a GLB file and return the imported objects"""
    before_import = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=filepath)
    after_import = set(bpy.data.objects)
    imported_objects = list(after_import - before_import)
    return imported_objects


def create_simple_humanoid_rig(mesh_obj):
    """Create a simple humanoid rig for a mesh"""
    # Add armature
    bpy.ops.object.armature_add(location=(0, 0, 0))
    armature = bpy.context.active_object
    armature.name = f"{mesh_obj.name}_Armature"

    # Enter edit mode to create bones
    bpy.ops.object.mode_set(mode='EDIT')
    edit_bones = armature.data.edit_bones

    # Get mesh bounds for bone placement
    bounds = mesh_obj.bound_box
    min_z = min(v[2] for v in bounds)
    max_z = max(v[2] for v in bounds)
    min_y = min(v[1] for v in bounds)
    max_y = max(v[1] for v in bounds)
    center_x = sum(v[0] for v in bounds) / 8
    center_y = sum(v[1] for v in bounds) / 8
    height = max_z - min_z

    # Create root bone
    root = edit_bones.new('Root')
    root.head = (center_x, center_y, min_z)
    root.tail = (center_x, center_y, min_z + height * 0.2)

    # Create spine bones
    spine1 = edit_bones.new('Spine1')
    spine1.head = root.tail
    spine1.tail = (center_x, center_y, min_z + height * 0.5)
    spine1.parent = root

    spine2 = edit_bones.new('Spine2')
    spine2.head = spine1.tail
    spine2.tail = (center_x, center_y, min_z + height * 0.7)
    spine2.parent = spine1

    # Create head bone
    head = edit_bones.new('Head')
    head.head = spine2.tail
    head.tail = (center_x, center_y, max_z)
    head.parent = spine2

    # Create JAW bone (Facial Rigging)
    jaw = edit_bones.new('Jaw')
    jaw.head = (center_x, center_y - (max_y - min_y) * 0.1, max_z - height * 0.2) # forward and down from head center
    jaw.tail = (center_x, center_y - (max_y - min_y) * 0.3, max_z - height * 0.3) # chin area
    jaw.parent = head

    bpy.ops.object.mode_set(mode='OBJECT')

    # Parent mesh to armature with automatic weights
    bpy.context.view_layer.objects.active = armature
    mesh_obj.select_set(True)
    armature.select_set(True)
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')

    return armature


def create_simple_quadruped_rig(mesh_obj):
    """Create a simple quadruped rig"""
    bpy.ops.object.armature_add(location=(0, 0, 0))
    armature = bpy.context.active_object
    armature.name = f"{mesh_obj.name}_Armature"

    bpy.ops.object.mode_set(mode='EDIT')
    edit_bones = armature.data.edit_bones

    # Get mesh bounds
    bounds = mesh_obj.bound_box
    min_z = min(v[2] for v in bounds)
    max_z = max(v[2] for v in bounds)
    min_y = min(v[1] for v in bounds)
    max_y = max(v[1] for v in bounds)
    center_x = sum(v[0] for v in bounds) / 8
    height = max_z - min_z
    length = max_y - min_y

    # Create spine bones along length
    root = edit_bones.new('Root')
    root.head = (center_x, min_y + length * 0.5, min_z + height * 0.3)
    root.tail = (center_x, min_y + length * 0.5, min_z + height * 0.5)

    bpy.ops.object.mode_set(mode='OBJECT')

    # Parent mesh to armature with automatic weights
    bpy.context.view_layer.objects.active = armature
    mesh_obj.select_set(True)
    armature.select_set(True)
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')

    return armature


def create_talk_animation(armature, char_type='humanoid'):
    """Create a simple talking animation (jaw flap)"""
    bpy.context.view_layer.objects.active = armature
    bpy.ops.object.mode_set(mode='POSE')

    # Create new action
    action = bpy.data.actions.new(name=f"{armature.name}_Talk")
    armature.animation_data_create()
    armature.animation_data.action = action

    frame_start = 1
    frame_end = 20  # Fast talking loop

    bpy.context.scene.frame_start = frame_start
    bpy.context.scene.frame_end = frame_end

    # Animate jaw bone
    jaw_bone = armature.pose.bones.get('Jaw')
    if not jaw_bone:
        print("⚠️ No Jaw bone found for talking animation")
        bpy.ops.object.mode_set(mode='OBJECT')
        return None

    # Keyframe 1 - Closed
    bpy.context.scene.frame_set(frame_start)
    jaw_bone.rotation_euler = (0, 0, 0)
    jaw_bone.keyframe_insert(data_path="rotation_euler", frame=frame_start)

    # Keyframe 2 - Open (rotate down on X axis)
    bpy.context.scene.frame_set(frame_start + 5)
    jaw_bone.rotation_euler = (0.3, 0, 0) # Open mouth
    jaw_bone.keyframe_insert(data_path="rotation_euler", frame=frame_start + 5)

    # Keyframe 3 - Closed
    bpy.context.scene.frame_set(frame_start + 10)
    jaw_bone.rotation_euler = (0, 0, 0)
    jaw_bone.keyframe_insert(data_path="rotation_euler", frame=frame_start + 10)

     # Keyframe 4 - Open slightly
    bpy.context.scene.frame_set(frame_start + 15)
    jaw_bone.rotation_euler = (0.15, 0, 0)
    jaw_bone.keyframe_insert(data_path="rotation_euler", frame=frame_start + 15)

    # Keyframe 5 - Closed
    bpy.context.scene.frame_set(frame_end)
    jaw_bone.rotation_euler = (0, 0, 0)
    jaw_bone.keyframe_insert(data_path="rotation_euler", frame=frame_end)

    bpy.ops.object.mode_set(mode='OBJECT')
    return action


def create_idle_animation(armature, char_type='humanoid'):
    """Create a simple idle breathing animation"""
    bpy.context.view_layer.objects.active = armature
    bpy.ops.object.mode_set(mode='POSE')

    # Create new action
    action = bpy.data.actions.new(name=f"{armature.name}_Idle")
    armature.animation_data_create()
    armature.animation_data.action = action

    frame_start = 1
    frame_end = 60  # 2 seconds at 30 fps

    bpy.context.scene.frame_start = frame_start
    bpy.context.scene.frame_end = frame_end

    # Animate subtle breathing motion
    for bone in armature.pose.bones:
        if 'Spine' in bone.name or 'Root' in bone.name:
            # Set keyframe at start
            bpy.context.scene.frame_set(frame_start)
            bone.scale = (1.0, 1.0, 1.0)
            bone.keyframe_insert(data_path="scale", frame=frame_start)

            # Set keyframe at middle (breathing in)
            bpy.context.scene.frame_set(frame_end // 2)
            bone.scale = (1.0, 1.0, 1.02)
            bone.keyframe_insert(data_path="scale", frame=frame_end // 2)

            # Set keyframe at end (back to start)
            bpy.context.scene.frame_set(frame_end)
            bone.scale = (1.0, 1.0, 1.0)
            bone.keyframe_insert(data_path="scale", frame=frame_end)

    bpy.ops.object.mode_set(mode='OBJECT')
    return action


def create_run_animation(armature, char_type='humanoid'):
    """Create a simple run animation"""
    bpy.context.view_layer.objects.active = armature
    bpy.ops.object.mode_set(mode='POSE')

    # Create new action
    action = bpy.data.actions.new(name=f"{armature.name}_Run")
    armature.animation_data_create()
    armature.animation_data.action = action

    frame_start = 1
    frame_end = 30  # 1 second at 30 fps

    bpy.context.scene.frame_start = frame_start
    bpy.context.scene.frame_end = frame_end

    # Simple bobbing motion for run
    for bone in armature.pose.bones:
        if 'Root' in bone.name:
            # Keyframe 1 - down
            bpy.context.scene.frame_set(frame_start)
            bone.location = (0, 0, 0)
            bone.keyframe_insert(data_path="location", frame=frame_start)

            # Keyframe 2 - up
            bpy.context.scene.frame_set(frame_start + 7)
            bone.location = (0, 0, 0.1)
            bone.keyframe_insert(data_path="location", frame=frame_start + 7)

            # Keyframe 3 - down
            bpy.context.scene.frame_set(frame_start + 15)
            bone.location = (0, 0, 0)
            bone.keyframe_insert(data_path="location", frame=frame_start + 15)

            # Keyframe 4 - up
            bpy.context.scene.frame_set(frame_start + 22)
            bone.location = (0, 0, 0.1)
            bone.keyframe_insert(data_path="location", frame=frame_start + 22)

            # Keyframe 5 - back to start
            bpy.context.scene.frame_set(frame_end)
            bone.location = (0, 0, 0)
            bone.keyframe_insert(data_path="location", frame=frame_end)

    bpy.ops.object.mode_set(mode='OBJECT')
    return action


def export_animated_model(objects, output_path):
    """Export selected objects as GLB with animations"""
    # Select objects for export
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:
        obj.select_set(True)

    # Export as GLB with compression
    bpy.ops.export_scene.gltf(
        filepath=output_path,
        export_format='GLB',
        use_selection=True,
        export_animations=True,
        export_skins=True,
        export_apply=False,
        export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=6
    )

    print(f"✅ Exported: {output_path}")


def process_character(char_info):
    """Process a single character: import, rig, animate, export"""
    char_name = char_info['name']
    char_type = char_info['type']
    animations = char_info.get('animations', ['idle', 'run', 'talk']) # Added 'talk' default

    print(f"\n{'='*60}")
    print(f"Processing: {char_name} ({char_type})")
    print(f"{'='*60}")

    # Clear scene
    clear_scene()

    # Import model
    input_path = os.path.join(MODELS_DIR, f"{char_name}.glb")
    if not os.path.exists(input_path):
        print(f"❌ Model not found: {input_path}")
        return False

    print(f"📥 Importing: {input_path}")
    imported_objects = import_glb(input_path)

    if not imported_objects:
        print(f"❌ Failed to import model")
        return False

    # Find the mesh object
    mesh_obj = None
    for obj in imported_objects:
        if obj.type == 'MESH':
            mesh_obj = obj
            break

    if not mesh_obj:
        print(f"❌ No mesh found in imported objects")
        return False

    print(f"✅ Found mesh: {mesh_obj.name}")

    # Create rig based on character type
    print(f"🦴 Creating {char_type} rig...")
    if char_type == 'humanoid':
        armature = create_simple_humanoid_rig(mesh_obj)
    elif char_type in ['quadruped', 'bird', 'reptile']:
        armature = create_simple_quadruped_rig(mesh_obj)
    else:
        # For special cases, use simple rig
        armature = create_simple_humanoid_rig(mesh_obj)

    print(f"✅ Rig created: {armature.name}")

    # Create and export animations
    export_objects = [mesh_obj, armature]

    if 'idle' in animations:
        print(f"🎬 Creating idle animation...")
        create_idle_animation(armature, char_type)

        output_path = os.path.join(OUTPUT_DIR, f"{char_name}_idle.glb")
        print(f"💾 Exporting idle animation...")
        export_animated_model(export_objects, output_path)

    if 'run' in animations:
        print(f"🎬 Creating run animation...")
        create_run_animation(armature, char_type)

        output_path = os.path.join(OUTPUT_DIR, f"{char_name}_run.glb")
        print(f"💾 Exporting run animation...")
        export_animated_model(export_objects, output_path)

    if 'talk' in animations:
        print(f"🎬 Creating talk animation...")
        create_talk_animation(armature, char_type)

        output_path = os.path.join(OUTPUT_DIR, f"{char_name}_talk.glb")
        print(f"💾 Exporting talk animation...")
        export_animated_model(export_objects, output_path)

    print(f"✅ Completed: {char_name}")
    return True


def main():
    """Main execution function"""
    # Characters to process
    CHARACTERS = [
        # TEST CHARACTER - Using the correct source model from remote repo
        {'name': 'achilles_source', 'type': 'humanoid', 'animations': ['talk']},
    ]

    print(f"\n{'#'*60}")
    print(f"# Blender Auto-Rig and Animation Script")
    print(f"# Processing {len(CHARACTERS)} characters")
    print(f"{'#'*60}\n")


    success_count = 0
    fail_count = 0

    for char_info in CHARACTERS:
        try:
            if process_character(char_info):
                success_count += 1
            else:
                fail_count += 1
        except Exception as e:
            print(f"❌ Error processing {char_info['name']}: {str(e)}")
            fail_count += 1

    print(f"\n{'='*60}")
    print(f"SUMMARY")
    print(f"{'='*60}")
    print(f"✅ Successful: {success_count}")
    print(f"❌ Failed: {fail_count}")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
