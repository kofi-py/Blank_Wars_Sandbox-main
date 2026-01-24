import bpy
import os
import shutil
import math
import mathutils
from mathutils import Vector

# ==============================================================================
# CONFIGURATION
# ==============================================================================

BATCH_MODE = False
TEST_FILE = "/Users/gabrielgreenstein/Blank_Wars_2026/verified_assets_new/uncompressed/confessional/dracula_confessional_spartan_apt.glb"

SEARCH_DIRS = [
    "/Users/gabrielgreenstein/Blank_Wars_2026/verified_assets_new/uncompressed",
]

IGNORE_PATTERNS = [".bak"]

# Jaw zone configuration - controls which vertices are affected by jaw bone
# These are percentages of the head height
JAW_ZONE_TOP_PERCENT = 0.25  # Jaw affects bottom 25% of head
JAW_MAX_INFLUENCE_RADIUS = 0.15  # Maximum radius of jaw influence (as fraction of model height)

# ==============================================================================
# LOGGING
# ==============================================================================

def log(msg):
    print(f"[JAW-SCRIPT] {msg}")

# ==============================================================================
# MESH CLEANUP FUNCTIONS
# ==============================================================================

def cleanup_mesh(mesh_obj):
    """Clean up mesh to improve armature binding success"""
    log("  -> Cleaning up mesh geometry...")
    
    # Store current mode
    original_mode = bpy.context.object.mode if bpy.context.object else 'OBJECT'
    
    # Select and activate mesh
    bpy.ops.object.select_all(action='DESELECT')
    mesh_obj.select_set(True)
    bpy.context.view_layer.objects.active = mesh_obj
    
    # Enter edit mode
    bpy.ops.object.mode_set(mode='EDIT')
    
    # Select all geometry
    bpy.ops.mesh.select_all(action='SELECT')
    
    # Remove duplicate vertices (merge by distance)
    bpy.ops.mesh.remove_doubles(threshold=0.0001)
    
    # Remove loose vertices/edges/faces
    bpy.ops.mesh.delete_loose(use_verts=True, use_edges=True, use_faces=True)
    
    # Recalculate normals (outside)
    bpy.ops.mesh.normals_make_consistent(inside=False)
    
    # Return to object mode  
    bpy.ops.object.mode_set(mode='OBJECT')
    
    log("  -> Mesh cleanup complete")

# ==============================================================================
# VERTEX GROUP FUNCTIONS
# ==============================================================================

def get_mesh_bounds(mesh_obj):
    """Get world-space bounding box of mesh"""
    bbox_corners = [mesh_obj.matrix_world @ Vector(corner) for corner in mesh_obj.bound_box]
    bbox_min = Vector([min([c[i] for c in bbox_corners]) for i in range(3)])
    bbox_max = Vector([max([c[i] for c in bbox_corners]) for i in range(3)])
    return bbox_min, bbox_max

def find_head_and_mouth_from_vertices(mesh_obj):
    """
    Find the actual head and mouth position by analyzing mesh vertices.
    
    Strategy:
    1. Find the topmost vertices (these are in the head region)
    2. Among head vertices, find the front-facing ones in the lower portion (mouth/chin area)
    3. Return precise position for jaw bone placement
    """
    log("  -> Analyzing mesh vertices to find actual head and mouth location...")
    
    world_matrix = mesh_obj.matrix_world
    mesh_data = mesh_obj.data
    
    # Get all vertex world positions with their coordinates
    all_verts = []
    for v in mesh_data.vertices:
        world_pos = world_matrix @ v.co
        all_verts.append({
            'index': v.index,
            'x': world_pos.x,
            'y': world_pos.y,
            'z': world_pos.z
        })
    
    if not all_verts:
        log("  -> ERROR: No vertices found!")
        return None
    
    total_verts = len(all_verts)
    log(f"     Total vertices: {total_verts}")
    
    # Sort vertices by Z (highest first) to find head
    verts_by_z = sorted(all_verts, key=lambda v: v['z'], reverse=True)
    
    # Get bounding box for reference
    min_z = min(v['z'] for v in all_verts)
    max_z = max(v['z'] for v in all_verts)
    min_y = min(v['y'] for v in all_verts)
    max_y = max(v['y'] for v in all_verts)
    model_height = max_z - min_z
    
    # HEAD DETECTION: Top 2% of vertices by Z are in the head region
    head_vertex_count = max(100, int(total_verts * 0.02))
    head_verts = verts_by_z[:head_vertex_count]
    
    # Calculate head center and bounds
    head_min_z = min(v['z'] for v in head_verts)
    head_max_z = max(v['z'] for v in head_verts)
    head_avg_x = sum(v['x'] for v in head_verts) / len(head_verts)
    head_avg_y = sum(v['y'] for v in head_verts) / len(head_verts)
    head_avg_z = sum(v['z'] for v in head_verts) / len(head_verts)
    head_height = head_max_z - head_min_z
    
    log(f"     Head region: z=[{head_min_z:.3f} to {head_max_z:.3f}], height={head_height:.3f}")
    log(f"     Head center: ({head_avg_x:.3f}, {head_avg_y:.3f}, {head_avg_z:.3f})")
    
    # MOUTH DETECTION: Find front-facing vertices in lower portion of head
    # Mouth is typically:
    # - In the lower 40% of the head
    # - Front-facing (more negative Y than head center, or at minimum Y for that Z level)
    # - Near the center X
    
    mouth_z_threshold = head_min_z + (head_height * 0.4)  # Bottom 40% of head
    
    # Filter for mouth-area vertices
    mouth_candidates = []
    for v in head_verts:
        if v['z'] <= mouth_z_threshold:
            # Check if front-facing (Y < head center Y)
            if v['y'] <= head_avg_y:
                mouth_candidates.append(v)
    
    # If we didn't find enough, widen the search slightly
    if len(mouth_candidates) < 10:
        log(f"     Few mouth candidates ({len(mouth_candidates)}), widening search...")
        # Look at bottom 60% of head, any Y position
        mouth_z_threshold = head_min_z + (head_height * 0.6)
        mouth_candidates = [v for v in head_verts if v['z'] <= mouth_z_threshold]
    
    if not mouth_candidates:
        log("  -> WARNING: Could not find mouth vertices, using head bottom as fallback")
        # Use the bottom of the head region as fallback
        mouth_x = head_avg_x
        mouth_y = min(v['y'] for v in head_verts)  # Most forward point
        mouth_z = head_min_z
    else:
        # Find the most forward (min Y) points among mouth candidates
        mouth_candidates_sorted_y = sorted(mouth_candidates, key=lambda v: v['y'])
        front_mouth_verts = mouth_candidates_sorted_y[:max(5, len(mouth_candidates)//3)]
        
        mouth_x = sum(v['x'] for v in front_mouth_verts) / len(front_mouth_verts)
        mouth_y = sum(v['y'] for v in front_mouth_verts) / len(front_mouth_verts)
        mouth_z = sum(v['z'] for v in front_mouth_verts) / len(front_mouth_verts)
    
    log(f"     MOUTH POSITION FOUND: ({mouth_x:.3f}, {mouth_y:.3f}, {mouth_z:.3f})")
    
    return {
        'head_min_z': head_min_z,
        'head_max_z': head_max_z,
        'head_height': head_height,
        'head_center_x': head_avg_x,
        'head_center_y': head_avg_y,
        'head_center_z': head_avg_z,
        'mouth_x': mouth_x,
        'mouth_y': mouth_y,
        'mouth_z': mouth_z,
        'model_height': model_height,
        'model_min_z': min_z,
        'model_max_z': max_z,
        # Legacy compatibility
        'head_bottom_z': head_min_z,
        'head_top_z': head_max_z,
        'center_x': head_avg_x,
        'center_y': head_avg_y,
    }

def assign_vertex_weights(mesh_obj, armature, head_info, bbox_min, bbox_max):
    """
    Manually assign vertex weights based on position.
    
    Strategy:
    - Vertices in the jaw zone get Jaw bone influence with distance-based falloff
    - All other vertices get rigid binding to Head, Spine2, Spine1, or Root based on Z height
    """
    log("  -> Assigning vertex weights manually (distance-based)...")
    
    # Get armature bones for positioning
    jaw_bone = armature.data.bones.get("Jaw")
    head_bone = armature.data.bones.get("Head")
    spine2_bone = armature.data.bones.get("Spine2")
    spine1_bone = armature.data.bones.get("Spine1")
    root_bone = armature.data.bones.get("Root")
    
    if not jaw_bone:
        log("  -> ERROR: Jaw bone not found!")
        return False
    
    # Calculate jaw position in world space
    jaw_world_pos = armature.matrix_world @ jaw_bone.head_local
    
    # Define jaw influence zone
    head_height = head_info['head_height']
    model_height = head_info['model_height']
    
    # Jaw zone: bottom portion of head, front-facing
    jaw_zone_max_z = head_info['head_bottom_z'] + (head_height * JAW_ZONE_TOP_PERCENT)
    jaw_influence_radius = model_height * JAW_MAX_INFLUENCE_RADIUS
    
    log(f"     Jaw zone: z < {jaw_zone_max_z:.3f}, radius = {jaw_influence_radius:.3f}")
    log(f"     Jaw bone position: {jaw_world_pos}")
    
    # Create vertex groups if they don't exist
    bone_names = ["Root", "Spine1", "Spine2", "Head", "Jaw"]
    vertex_groups = {}
    
    for name in bone_names:
        if name not in mesh_obj.vertex_groups:
            vg = mesh_obj.vertex_groups.new(name=name)
        else:
            vg = mesh_obj.vertex_groups[name]
        vertex_groups[name] = vg
    
    # Get mesh data
    mesh_data = mesh_obj.data
    world_matrix = mesh_obj.matrix_world
    
    # Height thresholds for body segmentation
    h = model_height
    root_max_z = bbox_min.z + h * 0.20
    spine1_max_z = bbox_min.z + h * 0.45
    spine2_max_z = bbox_min.z + h * 0.70
    head_max_z = bbox_max.z
    
    # Statistics
    stats = {"Jaw": 0, "Head": 0, "Spine2": 0, "Spine1": 0, "Root": 0}
    
    # Process each vertex
    for vert in mesh_data.vertices:
        vert_world = world_matrix @ vert.co
        vert_z = vert_world.z
        vert_y = vert_world.y  # Front/back (negative Y = front in Blender)
        
        # Check if vertex is in jaw zone
        in_jaw_zone = False
        jaw_weight = 0.0
        
        # Jaw zone criteria:
        # 1. Z position is in lower part of head
        # 2. Y position is front-facing (negative or near center)
        # 3. Within influence radius of jaw bone
        
        if vert_z >= head_info['head_bottom_z'] and vert_z <= jaw_zone_max_z:
            # Front-facing check (Y <= center means front)
            if vert_y <= head_info['center_y']:
                # Distance from jaw bone
                dist_to_jaw = (vert_world - jaw_world_pos).length
                
                if dist_to_jaw <= jaw_influence_radius:
                    in_jaw_zone = True
                    # Weight based on distance (closer = stronger)
                    jaw_weight = 1.0 - (dist_to_jaw / jaw_influence_radius)
                    jaw_weight = max(0.0, min(1.0, jaw_weight))  # Clamp 0-1
                    
                    # Apply smoothstep for nicer falloff
                    jaw_weight = jaw_weight * jaw_weight * (3 - 2 * jaw_weight)
        
        if in_jaw_zone and jaw_weight > 0.01:
            # Assign to Jaw with calculated weight
            vertex_groups["Jaw"].add([vert.index], jaw_weight, 'REPLACE')
            # Also assign remaining weight to Head for smooth blending
            head_weight = 1.0 - jaw_weight
            if head_weight > 0.01:
                vertex_groups["Head"].add([vert.index], head_weight, 'REPLACE')
            stats["Jaw"] += 1
        else:
            # Assign rigidly based on Z position
            if vert_z < root_max_z:
                vertex_groups["Root"].add([vert.index], 1.0, 'REPLACE')
                stats["Root"] += 1
            elif vert_z < spine1_max_z:
                vertex_groups["Spine1"].add([vert.index], 1.0, 'REPLACE')
                stats["Spine1"] += 1
            elif vert_z < spine2_max_z:
                vertex_groups["Spine2"].add([vert.index], 1.0, 'REPLACE')
                stats["Spine2"] += 1
            else:
                vertex_groups["Head"].add([vert.index], 1.0, 'REPLACE')
                stats["Head"] += 1
    
    log(f"     Vertex assignments: Jaw={stats['Jaw']}, Head={stats['Head']}, Spine2={stats['Spine2']}, Spine1={stats['Spine1']}, Root={stats['Root']}")
    
    if stats["Jaw"] == 0:
        log("  -> WARNING: No vertices assigned to Jaw! Adjusting parameters...")
        return False
    
    return True

# ==============================================================================
# MAIN PROCESSING FUNCTION
# ==============================================================================

def process_single_file(filepath):
    filename = os.path.basename(filepath)
    
    # Skip ignored files
    for pattern in IGNORE_PATTERNS:
        if pattern.lower() in filename.lower():
            log(f"Skipping ignored file: {filename}")
            return False

    log(f"Processing: {filepath}")
    log("=" * 60)

    # 1. Create Backup
    backup_path = filepath + ".bak"
    if not os.path.exists(backup_path):
        try:
            shutil.copy2(filepath, backup_path)
            log(f"  -> Backup created: {filename}.bak")
        except Exception as e:
            log(f"  -> ERROR creating backup: {e}")
            return False
    else:
        log(f"  -> Backup exists: {filename}.bak")

    # 2. Clear scene
    log("  -> Clearing scene...")
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()
    
    # Clear orphan data
    for block in bpy.data.meshes:
        if block.users == 0:
            bpy.data.meshes.remove(block)
    for block in bpy.data.armatures:
        if block.users == 0:
            bpy.data.armatures.remove(block)
    for block in bpy.data.actions:
        if block.users == 0:
            bpy.data.actions.remove(block)

    # 3. Import GLB
    log("  -> Importing GLB...")
    try:
        bpy.ops.import_scene.gltf(filepath=filepath)
        log(f"  -> Import successful")
    except Exception as e:
        log(f"  -> ERROR importing: {e}")
        return False

    # 4. Find the mesh object
    mesh_obj = None
    for obj in bpy.context.scene.objects:
        if obj.type == 'MESH':
            mesh_obj = obj
            break
    
    if not mesh_obj:
        log("  -> ERROR: No mesh found!")
        return False
    
    log(f"  -> Found mesh: {mesh_obj.name} ({len(mesh_obj.data.vertices)} vertices)")

    # 5. Clean up mesh
    cleanup_mesh(mesh_obj)

    # 6. Find actual head and mouth position from mesh vertices
    bbox_min, bbox_max = get_mesh_bounds(mesh_obj)
    head_info = find_head_and_mouth_from_vertices(mesh_obj)
    
    if not head_info:
        log("  -> ERROR: Could not detect head/mouth position!")
        return False
    
    height = head_info['model_height']
    center_x = head_info['center_x']
    center_y = head_info['center_y']

    # 7. Create Armature
    log("  -> Creating armature with bone hierarchy...")
    bpy.ops.object.armature_add(enter_editmode=True, align='WORLD', location=(0, 0, 0))
    armature = bpy.context.active_object
    armature.name = "Armature"
    armature.data.name = "Armature"
    
    # Delete default bone
    bpy.ops.armature.select_all(action='SELECT')
    bpy.ops.armature.delete()
    
    edit_bones = armature.data.edit_bones
    
    # Create bone hierarchy: Root -> Spine1 -> Spine2 -> Head -> Jaw
    base_z = bbox_min.z
    
    # Root bone (at base)
    root = edit_bones.new("Root")
    root.head = (center_x, center_y, base_z)
    root.tail = (center_x, center_y, base_z + height * 0.15)
    
    # Spine1 (30% up)
    spine1 = edit_bones.new("Spine1")
    spine1.head = root.tail
    spine1.tail = (center_x, center_y, base_z + height * 0.45)
    spine1.parent = root
    spine1.use_connect = True
    
    # Spine2 (60% up)
    spine2 = edit_bones.new("Spine2")
    spine2.head = spine1.tail
    spine2.tail = (center_x, center_y, base_z + height * 0.70)
    spine2.parent = spine1
    spine2.use_connect = True
    
    # Head bone - position at actual detected head location
    head = edit_bones.new("Head")
    head.head = spine2.tail
    head.tail = (head_info['head_center_x'], head_info['head_center_y'], head_info['head_max_z'])
    head.parent = spine2
    head.use_connect = True
    
    # Jaw bone - position at ACTUAL MOUTH LOCATION detected from vertices
    jaw = edit_bones.new("Jaw")
    mouth_x = head_info['mouth_x']
    mouth_y = head_info['mouth_y']
    mouth_z = head_info['mouth_z']
    
    # Jaw head at mouth, tail extends forward-down
    jaw.head = (mouth_x, mouth_y, mouth_z)
    jaw.tail = (mouth_x, mouth_y - 0.05, mouth_z - 0.02)
    jaw.parent = head
    jaw.use_connect = False
    
    log(f"  -> Created bones: Root -> Spine1 -> Spine2 -> Head -> Jaw")
    log(f"     JAW BONE at ACTUAL MOUTH: ({mouth_x:.3f}, {mouth_y:.3f}, {mouth_z:.3f})")
    log(f"     Head region z: {head_info['head_min_z']:.3f} to {head_info['head_max_z']:.3f}")
    
    # Switch to object mode
    bpy.ops.object.mode_set(mode='OBJECT')
    
    # 8. Assign vertex weights manually
    success = assign_vertex_weights(mesh_obj, armature, head_info, bbox_min, bbox_max)
    if not success:
        log("  -> ERROR: Vertex weight assignment failed!")
        return False
    
    # 9. Add Armature modifier to mesh
    log("  -> Adding Armature modifier to mesh...")
    
    # Remove any existing armature modifiers
    for mod in mesh_obj.modifiers:
        if mod.type == 'ARMATURE':
            mesh_obj.modifiers.remove(mod)
    
    # Add new armature modifier
    arm_mod = mesh_obj.modifiers.new(name="Armature", type='ARMATURE')
    arm_mod.object = armature
    arm_mod.use_vertex_groups = True
    
    # Parent mesh to armature (without automatic weights!)
    mesh_obj.parent = armature
    mesh_obj.matrix_parent_inverse = armature.matrix_world.inverted()
    
    log(f"  -> Armature modifier added: {arm_mod.name}")

    # 10. Create animations
    log("  -> Creating animations...")
    
    if armature.animation_data:
        armature.animation_data_clear()
    armature.animation_data_create()
    
    # Set rotation mode for pose bones
    bpy.ops.object.mode_set(mode='POSE')
    for pbone in armature.pose.bones:
        pbone.rotation_mode = 'XYZ'
    
    jaw_pose = armature.pose.bones["Jaw"]
    head_pose = armature.pose.bones["Head"]
    
    # Create Talk animation
    talk_action = bpy.data.actions.new("Talk")
    talk_action.use_fake_user = True
    armature.animation_data.action = talk_action
    
    # Jaw open/close cycle (40 frames at 24fps = ~1.7 seconds)
    jaw_keyframes = [
        (0, 0.0),       # Closed
        (5, 0.12),      # Open
        (10, 0.0),      # Closed
        (15, 0.10),     # Open (variation)
        (20, 0.0),      # Closed
        (25, 0.15),     # Open more
        (30, 0.05),     # Almost closed
        (35, 0.12),     # Open
        (40, 0.0),      # Closed (loop point)
    ]
    
    for frame, angle in jaw_keyframes:
        bpy.context.scene.frame_set(frame)
        jaw_pose.rotation_euler = (angle, 0, 0)
        jaw_pose.keyframe_insert(data_path="rotation_euler", frame=frame)
    
    log(f"  -> Created Talk animation (40 frames)")
    
    # Create Idle animation
    idle_action = bpy.data.actions.new("Idle")
    idle_action.use_fake_user = True
    armature.animation_data.action = idle_action
    
    # Subtle idle movement
    idle_keyframes = [
        (0, (0.0, 0.0, 0.0)),
        (30, (0.01, 0.005, 0.0)),
        (60, (0.0, 0.0, 0.0)),
    ]
    
    for frame, angles in idle_keyframes:
        bpy.context.scene.frame_set(frame)
        head_pose.rotation_euler = angles
        head_pose.keyframe_insert(data_path="rotation_euler", frame=frame)
        jaw_pose.rotation_euler = (0, 0, 0)
        jaw_pose.keyframe_insert(data_path="rotation_euler", frame=frame)
    
    log(f"  -> Created Idle animation (60 frames)")
    
    bpy.ops.object.mode_set(mode='OBJECT')
    
    # 11. Verify before export
    log("  -> Verifying setup...")
    vg_count = len(mesh_obj.vertex_groups)
    has_armature_mod = any(m.type == 'ARMATURE' for m in mesh_obj.modifiers)
    log(f"     Vertex groups: {vg_count}")
    log(f"     Armature modifier: {has_armature_mod}")
    
    if vg_count == 0 or not has_armature_mod:
        log("  -> ERROR: Verification failed - missing vertex groups or modifier!")
        return False

    # 12. Export GLB
    log("  -> Exporting GLB...")
    try:
        bpy.ops.export_scene.gltf(
            filepath=filepath,
            export_format='GLB',
            use_selection=False,
            export_skins=True,
            export_all_influences=True,
            export_yup=True,
            export_animations=True,
            export_nla_strips=False,
        )
        log(f"  -> SUCCESS: Exported {filename}")
        return True
    except Exception as e:
        log(f"  -> ERROR exporting: {e}")
        return False

# ==============================================================================
# MAIN EXECUTION
# ==============================================================================

if __name__ == "__main__":
    log("=" * 60)
    log("Proper Jaw Rigging Script - Manual Vertex Weights")
    log("=" * 60)
    log(f"Blender version: {bpy.app.version_string}")
    
    files_to_process = []

    if BATCH_MODE:
        log("Running in BATCH MODE")
        for search_dir in SEARCH_DIRS:
            if not os.path.exists(search_dir):
                log(f"Directory not found: {search_dir}")
                continue
            for root, dirs, files in os.walk(search_dir):
                for file in files:
                    if file.lower().endswith(".glb") and ".bak" not in file:
                        full_path = os.path.join(root, file)
                        files_to_process.append(full_path)
    else:
        log(f"Running in TEST MODE")
        log(f"Test file: {TEST_FILE}")
        if os.path.exists(TEST_FILE):
            files_to_process.append(TEST_FILE)
        else:
            log(f"ERROR: Test file not found!")

    log(f"Files to process: {len(files_to_process)}")
    log("")
    
    success_count = 0
    for fp in files_to_process:
        if process_single_file(fp):
            success_count += 1
        log("")

    log("=" * 60)
    log(f"Complete. Successfully processed {success_count} / {len(files_to_process)} files.")
    log("=" * 60)
