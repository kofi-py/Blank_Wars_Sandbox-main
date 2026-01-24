import struct
import json
import os
import glob

# Compare production (working) vs dracula after processing
glb_files = [
    "/Users/gabrielgreenstein/Blank_Wars_2026/frontend/public/models/achilles_talk.glb",  # Production working (reference)
    "/Users/gabrielgreenstein/Blank_Wars_2026/verified_assets_new/uncompressed/confessional/dracula_confessional_spartan_apt.glb",  # Just processed
]

print(f"Scanning {len(glb_files)} files...\n")
print("=" * 90)

for path in glb_files:
    filename = os.path.basename(path)
    size_mb = os.path.getsize(path) / (1024*1024)
    status = "UNKNOWN"
    
    try:
        with open(path, 'rb') as f:
            magic = f.read(4)
            if magic != b'glTF':
                status = "INVALID"
            else:
                version = struct.unpack('<I', f.read(4))[0]
                length = struct.unpack('<I', f.read(4))[0]
                
                # Scan chunks
                while f.tell() < length:
                    try:
                        chunk_length = struct.unpack('<I', f.read(4))[0]
                        chunk_type = f.read(4)
                    except:
                        break
                    
                    if chunk_type == b'JSON':
                        json_data = f.read(chunk_length)
                        try:
                            data = json.loads(json_data)
                            ext_req = data.get('extensionsRequired', [])
                            if 'EXT_meshopt_compression' in ext_req:
                                status = "COMPRESSED"
                            else:
                                status = "CLEAN"

                            print(f"\n=== {filename} ({size_mb:.2f} MB) - {status} ===")
                            
                            print(f"\n--- EXTENSIONS ---")
                            print(f"  extensionsUsed: {data.get('extensionsUsed', 'None')}")
                            print(f"  extensionsRequired: {data.get('extensionsRequired', 'None')}")
                            
                            print(f"\n--- SUMMARY ---")
                            print(f"  Skins: {len(data.get('skins', []))}")
                            if 'skins' in data and len(data['skins']) > 0:
                                for skin_idx, skin in enumerate(data['skins']):
                                    print(f"    Skin[{skin_idx}]: {skin.get('name', 'Unnamed')} - Joints: {len(skin.get('joints', []))}")
                            print(f"  Meshes: {len(data.get('meshes', []))}")
                            print(f"  Animations: {len(data.get('animations', []))}")
                            
                            # Show nodes (bones/objects hierarchy)
                            nodes = data.get('nodes', [])
                            print(f"\n--- NODES ({len(nodes)}) ---")
                            for i, node in enumerate(nodes):
                                name = node.get('name', f'Node_{i}')
                                has_mesh = 'mesh' in node
                                has_children = 'children' in node
                                has_skin = 'skin' in node
                                extras = []
                                if has_mesh: extras.append("MESH")
                                if has_children: extras.append(f"children:{len(node['children'])}")
                                if has_skin: extras.append("SKINNED")
                                extra_str = f" [{', '.join(extras)}]" if extras else ""
                                print(f"  [{i:2}] {name}{extra_str}")
                            
                            # Show animation details
                            if 'animations' in data and len(data['animations']) > 0:
                                print(f"\n--- ANIMATION DETAILS ---")
                                for anim_idx, anim in enumerate(data['animations']):
                                    anim_name = anim.get('name', f'Animation_{anim_idx}')
                                    channels = anim.get('channels', [])
                                    targets = set()
                                    for ch in channels:
                                        target_node = ch.get('target', {}).get('node')
                                        target_path = ch.get('target', {}).get('path', '')
                                        if target_node is not None:
                                            node_name = nodes[target_node].get('name', f'Node_{target_node}')
                                            targets.add(f"{node_name}:{target_path}")
                                    print(f"  Animation '{anim_name}':")
                                    for t in sorted(targets):
                                        print(f"    - {t}")
                            
                            print("\n" + "=" * 90)

                        except Exception as e:
                            status = f"JSON ERROR: {e}"
                        break
                    else:
                        f.seek(chunk_length, 1)
    except Exception as e:
        status = f"ERROR: {str(e)}"
        print(f"{filename}: {status}")
