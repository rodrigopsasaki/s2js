#!/usr/bin/env python3
"""
Generate golden test vectors from the s2sphere Python library (which wraps the C++ S2 library).
These vectors are used to cross-validate the @s2js TypeScript implementation.
"""

import json
import math
import s2sphere

def deg2rad(d):
    return d * math.pi / 180.0

def rad2deg(r):
    return r * 180.0 / math.pi

EARTH_RADIUS_KM = 6371.01
EARTH_RADIUS_M = 6371010

def generate_cellid_from_latlng():
    """Generate CellID test vectors from various lat/lng pairs."""
    cases = [
        (0, 0),
        (0, 90),
        (90, 0),
        (0, 180),
        (0, -90),
        (-90, 0),
        (37.7749, -122.4194),   # San Francisco
        (40.7128, -74.0060),    # New York
        (51.5074, -0.1278),     # London
        (35.6762, 139.6503),    # Tokyo
        (-33.8688, 151.2093),   # Sydney
        (48.8566, 2.3522),      # Paris
        (-22.9068, -43.1729),   # Rio de Janeiro
        (55.7558, 37.6173),     # Moscow
        (1.3521, 103.8198),     # Singapore
        (-37.8136, 144.9631),   # Melbourne
    ]

    results = []
    for lat_deg, lng_deg in cases:
        ll = s2sphere.LatLng.from_degrees(lat_deg, lng_deg)
        cell_id = s2sphere.CellId.from_lat_lng(ll)
        token = cell_id.to_token()
        results.append({
            "latDeg": lat_deg,
            "lngDeg": lng_deg,
            "latRad": deg2rad(lat_deg),
            "lngRad": deg2rad(lng_deg),
            "token": token,
            "id": str(cell_id.id()),
            "face": cell_id.face(),
            "level": cell_id.level(),
            "isLeaf": cell_id.is_leaf(),
        })
    return results

def generate_cellid_from_token():
    """Generate CellID property vectors from known tokens."""
    tokens = ["1", "3", "5", "7", "9", "b"]  # Face cells
    # Add some specific tokens
    tokens += [
        "1/",  # This won't work, use numeric tokens
    ]

    results = []
    for i in range(6):
        cell_id = s2sphere.CellId.from_face_pos_level(i, 0, 0)
        token = cell_id.to_token()
        ll = cell_id.to_lat_lng()
        results.append({
            "token": token,
            "face": cell_id.face(),
            "level": cell_id.level(),
            "latRad": ll.lat().radians,
            "lngRad": ll.lng().radians,
        })

    # Add some specific leaf cells
    for lat_deg, lng_deg in [(0, 0), (45, 90), (-30, -60)]:
        ll = s2sphere.LatLng.from_degrees(lat_deg, lng_deg)
        cell_id = s2sphere.CellId.from_lat_lng(ll)
        token = cell_id.to_token()
        ll_back = cell_id.to_lat_lng()
        results.append({
            "token": token,
            "face": cell_id.face(),
            "level": cell_id.level(),
            "latRad": ll_back.lat().radians,
            "lngRad": ll_back.lng().radians,
        })

    return results

def generate_parent_at_level():
    """Generate parent-at-level test vectors."""
    ll = s2sphere.LatLng.from_degrees(37.7749, -122.4194)  # San Francisco
    leaf = s2sphere.CellId.from_lat_lng(ll)

    results = []
    for level in [0, 5, 10, 15, 20, 25, 29]:
        p = leaf.parent(level)
        results.append({
            "childToken": leaf.to_token(),
            "level": level,
            "parentToken": p.to_token(),
            "parentFace": p.face(),
        })
    return results

def generate_children():
    """Generate children test vectors."""
    results = []
    for face in range(6):
        cell_id = s2sphere.CellId.from_face_pos_level(face, 0, 0)
        ch = [cell_id.child(i) for i in range(4)]
        results.append({
            "parentToken": cell_id.to_token(),
            "parentLevel": 0,
            "childTokens": [c.to_token() for c in ch],
            "childLevels": [c.level() for c in ch],
        })

    # Also test non-face cells
    ll = s2sphere.LatLng.from_degrees(40.7128, -74.0060)  # NYC
    for level in [5, 10, 15]:
        cell_id = s2sphere.CellId.from_lat_lng(ll).parent(level)
        ch = [cell_id.child(i) for i in range(4)]
        results.append({
            "parentToken": cell_id.to_token(),
            "parentLevel": level,
            "childTokens": [c.to_token() for c in ch],
            "childLevels": [c.level() for c in ch],
        })
    return results

def generate_contains():
    """Generate containment test vectors."""
    ll = s2sphere.LatLng.from_degrees(37.7749, -122.4194)
    leaf = s2sphere.CellId.from_lat_lng(ll)

    results = []
    for level in [0, 10, 20, 29]:
        ancestor = leaf.parent(level)
        results.append({
            "aToken": ancestor.to_token(),
            "bToken": leaf.to_token(),
            "aContainsB": ancestor.contains(leaf),
            "bContainsA": leaf.contains(ancestor),
            "aIntersectsB": ancestor.intersects(leaf),
        })

    # Disjoint cells
    ll2 = s2sphere.LatLng.from_degrees(-33.8688, 151.2093)  # Sydney
    cell2 = s2sphere.CellId.from_lat_lng(ll2)
    results.append({
        "aToken": leaf.to_token(),
        "bToken": cell2.to_token(),
        "aContainsB": leaf.contains(cell2),
        "bContainsA": cell2.contains(leaf),
        "aIntersectsB": leaf.intersects(cell2),
    })

    # Siblings
    face0 = s2sphere.CellId.from_face_pos_level(0, 0, 0)
    ch = [face0.child(i) for i in range(4)]
    results.append({
        "aToken": ch[0].to_token(),
        "bToken": ch[1].to_token(),
        "aContainsB": ch[0].contains(ch[1]),
        "bContainsA": ch[1].contains(ch[0]),
        "aIntersectsB": ch[0].intersects(ch[1]),
    })

    return results

def generate_next_prev():
    """Generate next/prev test vectors."""
    results = []
    for face in range(6):
        cell_id = s2sphere.CellId.from_face_pos_level(face, 0, 0)
        results.append({
            "token": cell_id.to_token(),
            "level": 0,
            "nextToken": cell_id.next().to_token(),
            "prevToken": cell_id.prev().to_token(),
        })

    # Leaf cells
    for lat, lng in [(0, 0), (45, 90)]:
        ll = s2sphere.LatLng.from_degrees(lat, lng)
        cell_id = s2sphere.CellId.from_lat_lng(ll)
        for level in [10, 20, 30]:
            c = cell_id.parent(level) if level < 30 else cell_id
            results.append({
                "token": c.to_token(),
                "level": c.level(),
                "nextToken": c.next().to_token(),
                "prevToken": c.prev().to_token(),
            })
    return results

def generate_edge_neighbors():
    """Generate edge neighbor test vectors."""
    results = []
    for face in range(6):
        cell_id = s2sphere.CellId.from_face_pos_level(face, 0, 0)
        neighbors = cell_id.get_edge_neighbors()
        results.append({
            "token": cell_id.to_token(),
            "level": 0,
            "neighborTokens": [n.to_token() for n in neighbors],
        })

    # Non-face cells
    for lat, lng in [(37.7749, -122.4194), (0, 0)]:
        ll = s2sphere.LatLng.from_degrees(lat, lng)
        cell_id = s2sphere.CellId.from_lat_lng(ll).parent(10)
        neighbors = cell_id.get_edge_neighbors()
        results.append({
            "token": cell_id.to_token(),
            "level": cell_id.level(),
            "neighborTokens": [n.to_token() for n in neighbors],
        })
    return results

def generate_to_point():
    """Generate toPoint test vectors."""
    results = []
    for lat, lng in [(0, 0), (90, 0), (-90, 0), (0, 90), (0, -90), (0, 180), (45, 45)]:
        ll = s2sphere.LatLng.from_degrees(lat, lng)
        cell_id = s2sphere.CellId.from_lat_lng(ll)
        point = cell_id.to_point()
        results.append({
            "token": cell_id.to_token(),
            "x": point[0],
            "y": point[1],
            "z": point[2],
        })
    return results

def generate_to_latlng():
    """Generate toLatLng test vectors."""
    results = []
    for face in range(6):
        cell_id = s2sphere.CellId.from_face_pos_level(face, 0, 0)
        ll = cell_id.to_lat_lng()
        results.append({
            "token": cell_id.to_token(),
            "latRad": ll.lat().radians,
            "lngRad": ll.lng().radians,
            "latDeg": rad2deg(ll.lat().radians),
            "lngDeg": rad2deg(ll.lng().radians),
        })

    # Leaf cells
    for lat, lng in [(37.7749, -122.4194), (0, 0), (-33.8688, 151.2093)]:
        ll_in = s2sphere.LatLng.from_degrees(lat, lng)
        cell_id = s2sphere.CellId.from_lat_lng(ll_in)
        ll_out = cell_id.to_lat_lng()
        results.append({
            "token": cell_id.to_token(),
            "latRad": ll_out.lat().radians,
            "lngRad": ll_out.lng().radians,
            "latDeg": rad2deg(ll_out.lat().radians),
            "lngDeg": rad2deg(ll_out.lng().radians),
        })
    return results

def generate_face_from_xyz():
    """Generate face-from-XYZ test vectors."""
    cases = [
        (1, 0, 0, 0),
        (0, 1, 0, 1),
        (0, 0, 1, 2),
        (-1, 0, 0, 3),
        (0, -1, 0, 4),
        (0, 0, -1, 5),
        # Diagonal points
        (1, 1, 0, 0),     # x dominant
        (0, 1, 1, 1),     # y dominant (tie breaks to lower face? depends on implementation)
        (1, 0, 1, 2),     # z dominant? depends
    ]

    results = []
    for x, y, z, expected_face in cases:
        # Use s2sphere to compute the actual face
        p = s2sphere.LatLng.from_angles(
            s2sphere.Angle.from_radians(math.atan2(z, math.sqrt(x*x + y*y))),
            s2sphere.Angle.from_radians(math.atan2(y, x))
        )
        cell_id = s2sphere.CellId.from_lat_lng(p)
        results.append({
            "x": x,
            "y": y,
            "z": z,
            "face": cell_id.face(),
        })
    return results

def generate_coordinate_conversions():
    """Generate stToUV/uvToST test vectors using the quadratic projection."""
    # S2 uses a quadratic projection:
    # stToUV: if s >= 0.5: (1/3)*(4*s*s - 1) else (1/3)*(1 - 4*(1-s)*(1-s))
    # uvToST: if u >= 0: 0.5*sqrt(1 + 3*u) else 1 - 0.5*sqrt(1 - 3*u)

    st_values = [0.0, 0.1, 0.25, 0.5, 0.75, 0.9, 1.0]
    st_to_uv = []
    for s in st_values:
        if s >= 0.5:
            u = (1.0/3.0) * (4*s*s - 1)
        else:
            u = (1.0/3.0) * (1 - 4*(1-s)*(1-s))
        st_to_uv.append({"s": s, "u": u})

    uv_values = [-1.0, -0.5, -0.25, 0.0, 0.25, 0.5, 1.0]
    uv_to_st = []
    for u in uv_values:
        if u >= 0:
            s = 0.5 * math.sqrt(1 + 3*u)
        else:
            s = 1 - 0.5 * math.sqrt(1 - 3*u)
        uv_to_st.append({"u": u, "s": s})

    return {"stToUV": st_to_uv, "uvToST": uv_to_st}

def generate_cap_tests():
    """Generate Cap test vectors."""
    area_tests = []

    # Empty cap area = 0
    area_tests.append({
        "centerX": 1, "centerY": 0, "centerZ": 0,
        "angleRad": -1,
        "area": 0,
        "description": "empty cap",
    })

    # Full cap area = 4π
    area_tests.append({
        "centerX": 1, "centerY": 0, "centerZ": 0,
        "angleRad": math.pi,
        "area": 4 * math.pi,
        "description": "full cap",
    })

    # Hemisphere area = 2π
    area_tests.append({
        "centerX": 0, "centerY": 0, "centerZ": 1,
        "angleRad": math.pi / 2,
        "area": 2 * math.pi,
        "description": "hemisphere",
    })

    # Quarter sphere (60 degrees)
    angle_60 = math.pi / 3
    area_60 = 2 * math.pi * (1 - math.cos(angle_60))
    area_tests.append({
        "centerX": 1, "centerY": 0, "centerZ": 0,
        "angleRad": angle_60,
        "area": area_60,
        "description": "60-degree cap",
    })

    # Small cap (1 degree)
    angle_1 = math.pi / 180
    area_1 = 2 * math.pi * (1 - math.cos(angle_1))
    area_tests.append({
        "centerX": 0, "centerY": 0, "centerZ": 1,
        "angleRad": angle_1,
        "area": area_1,
        "description": "1-degree cap",
    })

    # Containment tests
    containment_tests = []
    # Hemisphere centered at north pole
    containment_tests.append({
        "centerX": 0, "centerY": 0, "centerZ": 1,
        "angleRad": math.pi / 2 + 0.01,  # Slightly more than hemisphere
        "pointX": 1, "pointY": 0, "pointZ": 0,
        "result": True,
        "description": "hemisphere contains equatorial point",
    })
    containment_tests.append({
        "centerX": 0, "centerY": 0, "centerZ": 1,
        "angleRad": math.pi / 2 + 0.01,
        "pointX": 0, "pointY": 0, "pointZ": -1,
        "result": False,
        "description": "hemisphere does not contain south pole",
    })
    containment_tests.append({
        "centerX": 0, "centerY": 0, "centerZ": 1,
        "angleRad": math.pi / 4,
        "pointX": 0, "pointY": 0, "pointZ": 1,
        "result": True,
        "description": "cap contains its center",
    })

    return {"area": area_tests, "containsPoint": containment_tests}

def generate_latlng_rect_tests():
    """Generate LatLngRect test vectors."""
    area_tests = []

    # Full sphere rect area = 4π
    area_tests.append({
        "latLoDeg": -90, "latHiDeg": 90,
        "lngLoDeg": -180, "lngHiDeg": 180,
        "area": 4 * math.pi,
        "description": "full sphere",
    })

    # Northern hemisphere
    area_tests.append({
        "latLoDeg": 0, "latHiDeg": 90,
        "lngLoDeg": -180, "lngHiDeg": 180,
        "area": 2 * math.pi,
        "description": "northern hemisphere",
    })

    # Quarter sphere
    area_tests.append({
        "latLoDeg": 0, "latHiDeg": 90,
        "lngLoDeg": 0, "lngHiDeg": 180,
        "area": math.pi,
        "description": "quarter sphere (north, east)",
    })

    # Small rect near equator
    lat_lo = deg2rad(0)
    lat_hi = deg2rad(1)
    lng_lo = deg2rad(0)
    lng_hi = deg2rad(1)
    area_small = abs(math.sin(lat_hi) - math.sin(lat_lo)) * (lng_hi - lng_lo)
    area_tests.append({
        "latLoDeg": 0, "latHiDeg": 1,
        "lngLoDeg": 0, "lngHiDeg": 1,
        "area": area_small,
        "description": "1x1 degree rect at equator",
    })

    containment_tests = []
    containment_tests.append({
        "latLoDeg": 0, "latHiDeg": 90,
        "lngLoDeg": 0, "lngHiDeg": 180,
        "latDeg": 45, "lngDeg": 90,
        "result": True,
        "description": "point inside quarter sphere",
    })
    containment_tests.append({
        "latLoDeg": 0, "latHiDeg": 90,
        "lngLoDeg": 0, "lngHiDeg": 180,
        "latDeg": -10, "lngDeg": 90,
        "result": False,
        "description": "point outside quarter sphere (lat too low)",
    })

    return {"area": area_tests, "containsLatLng": containment_tests}

def generate_earth_tests():
    """Generate Earth conversion test vectors."""
    km_to_angle = []
    for km in [0, 1, 10, 100, 1000, 10000]:
        angle = km / EARTH_RADIUS_KM
        km_to_angle.append({"km": km, "angle": angle})

    m_to_angle = []
    for m in [0, 1, 100, 1000, 10000, 100000]:
        angle = m / EARTH_RADIUS_M
        m_to_angle.append({"m": m, "angle": angle})

    return {"kmToAngle": km_to_angle, "mToAngle": m_to_angle}

def generate_cellunion_normalize():
    """Generate CellUnion normalization test vectors."""
    results = []

    # Four siblings that should merge to their parent
    face0 = s2sphere.CellId.from_face_pos_level(0, 0, 0)
    children = [face0.child(i) for i in range(4)]
    results.append({
        "input": [c.to_token() for c in children],
        "output": [face0.to_token()],
        "description": "four siblings merge to parent",
    })

    # Duplicate removal
    ll = s2sphere.LatLng.from_degrees(0, 0)
    cell = s2sphere.CellId.from_lat_lng(ll)
    results.append({
        "input": [cell.to_token(), cell.to_token()],
        "output": [cell.to_token()],
        "description": "duplicates are removed",
    })

    # Parent subsumes child
    parent_cell = cell.parent(15)
    results.append({
        "input": [parent_cell.to_token(), cell.to_token()],
        "output": [parent_cell.to_token()],
        "description": "parent subsumes child",
    })

    return results

def generate_loop_area():
    """Generate loop area test vectors using the Girard formula."""
    results = []

    # Right triangle at the north pole (vertices on the sphere)
    # This is a well-known test case: a triangle with vertices at
    # (0°, 0°), (0°, 90°), (90°, 0°) has area = π/2
    results.append({
        "vertices": [
            {"latDeg": 0, "lngDeg": 0},
            {"latDeg": 0, "lngDeg": 90},
            {"latDeg": 90, "lngDeg": 0},
        ],
        "area": math.pi / 2,
        "description": "right triangle at north pole (spherical excess = π/2)",
    })

    # Hemisphere (4 vertices on equator)
    results.append({
        "vertices": [
            {"latDeg": 0, "lngDeg": 0},
            {"latDeg": 0, "lngDeg": 90},
            {"latDeg": 0, "lngDeg": 180},
            {"latDeg": 0, "lngDeg": -90},
        ],
        "area": 2 * math.pi,
        "description": "northern hemisphere (equatorial boundary)",
    })

    return results

def main():
    vectors = {
        "cellId": {
            "fromLatLng": generate_cellid_from_latlng(),
            "fromToken": generate_cellid_from_token(),
            "parentAtLevel": generate_parent_at_level(),
            "children": generate_children(),
            "contains": generate_contains(),
            "nextPrev": generate_next_prev(),
            "edgeNeighbors": generate_edge_neighbors(),
            "toPoint": generate_to_point(),
            "toLatLng": generate_to_latlng(),
        },
        "coordinates": {
            **generate_coordinate_conversions(),
            "faceFromXYZ": generate_face_from_xyz(),
        },
        "cellUnion": {
            "normalize": generate_cellunion_normalize(),
        },
        "cap": generate_cap_tests(),
        "latLngRect": generate_latlng_rect_tests(),
        "earth": generate_earth_tests(),
        "loop": {
            "area": generate_loop_area(),
        },
    }

    print(json.dumps(vectors, indent=2))

if __name__ == "__main__":
    main()
