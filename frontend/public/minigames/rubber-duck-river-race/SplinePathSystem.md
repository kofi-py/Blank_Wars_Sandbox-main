import * as THREE from 'three';

/**
 * 🎢 SPLINE PATH SYSTEM - Log Flume Course Manager
 *
 * This system creates a curved, twisting river course with:
 * - Multiple themed sections
 * - Varied elevation (climbs, drops, plateaus)
 * - Smooth curves and turns
 * - Support for dynamic speed based on slope
 */

export class SplinePathSystem {
    constructor() {
        this.spline = null;
        this.totalLength = 0;
        this.sections = [];
        this.waypoints = [];

        this.createLogFlumeCoursePath();
    }

    /**
     * Creates the complete log flume course with themed sections
     */
    createLogFlumeCoursePath() {
        console.log('🎢 Building Cadillac Log Flume Course...');

        // Define waypoints for the entire course
        // Format: [x, y, z] where y is elevation
        this.waypoints = [
            // 🌲 ACT 1: PEACEFUL FOREST START (0-400m)
            new THREE.Vector3(0, 0, 0),           // Start
            new THREE.Vector3(-5, 0, -50),        // Gentle left
            new THREE.Vector3(8, 0, -100),        // S-curve right
            new THREE.Vector3(-3, 0, -150),       // S-curve back
            new THREE.Vector3(5, -2, -200),       // Small dip
            new THREE.Vector3(0, -2, -250),       // Straighten
            new THREE.Vector3(-8, -3, -300),      // Left turn with small drop
            new THREE.Vector3(0, -5, -400),       // First rapids zone

            // 🏔️ ACT 2: CANYON RAPIDS (400-900m)
            new THREE.Vector3(12, -5, -450),      // Sharp right into canyon
            new THREE.Vector3(15, -8, -500),      // Drop 1 (3 units / ~10 feet)
            new THREE.Vector3(10, -8, -550),      // Curve left
            new THREE.Vector3(-10, -10, -600),    // Sharp S-curve
            new THREE.Vector3(-15, -12, -650),    // Drop 2 (2 units / ~7 feet)
            new THREE.Vector3(-8, -12, -700),     // Straighten
            new THREE.Vector3(0, -15, -750),      // Drop 3 (3 units / ~10 feet)
            new THREE.Vector3(10, -15, -800),     // Banked right turn
            new THREE.Vector3(5, -18, -850),      // Gentle drop
            new THREE.Vector3(0, -20, -900),      // Canyon depths

            // 🌑 ACT 3: DARK CAVE (900-1400m)
            new THREE.Vector3(-5, -20, -950),     // Cave entrance curve
            new THREE.Vector3(-8, -22, -1000),    // Descend into darkness
            new THREE.Vector3(0, -22, -1050),     // Tight winding section
            new THREE.Vector3(8, -22, -1100),     //
            new THREE.Vector3(5, -22, -1150),     //
            new THREE.Vector3(-5, -22, -1200),    //
            new THREE.Vector3(0, -22, -1250),     //
            new THREE.Vector3(0, -24, -1300),     // Small drop in darkness
            new THREE.Vector3(0, -24, -1350),     // Cave exit ahead
            new THREE.Vector3(0, -24, -1400),     // Exit tunnel

            // ⬆️ ACT 4: LIFT HILL (1400-1700m)
            new THREE.Vector3(0, -22, -1450),     // Start climbing
            new THREE.Vector3(0, -18, -1500),     // Conveyor lift
            new THREE.Vector3(0, -14, -1550),     // Keep climbing
            new THREE.Vector3(0, -10, -1600),     // Almost there...
            new THREE.Vector3(0, -5, -1650),      // Near the top
            new THREE.Vector3(0, 0, -1700),       // TOP OF THE WORLD!
            new THREE.Vector3(0, 0, -1750),       // Pause at summit

            // 💥 ACT 5: THE MEGA DROP (1750-1850m)
            new THREE.Vector3(0, 0, -1780),       // Edge...
            new THREE.Vector3(0, -10, -1800),     // FALLING!
            new THREE.Vector3(0, -20, -1820),     //
            new THREE.Vector3(0, -30, -1840),     // 30-foot drop!
            new THREE.Vector3(0, -30, -1860),     // Splashdown

            // 🏆 ACT 6: VICTORY LAP (1850-2100m)
            new THREE.Vector3(5, -30, -1900),     // Gentle curve
            new THREE.Vector3(-5, -30, -1950),    // S-curve
            new THREE.Vector3(0, -30, -2000),     // Straighten
            new THREE.Vector3(0, -30, -2050),     // Float to finish
            new THREE.Vector3(0, -30, -2100)      // FINISH LINE!
        ];

        // Create smooth Catmull-Rom spline
        this.spline = new THREE.CatmullRomCurve3(this.waypoints);
        this.spline.curveType = 'catmullrom';
        this.spline.tension = 0.5; // Smoothness (0 = sharp, 1 = very smooth)
        this.spline.closed = false;

        this.totalLength = this.spline.getLength();

        console.log(`✅ Spline created: ${this.waypoints.length} waypoints, ${this.totalLength.toFixed(0)}m long`);

        // Define themed sections
        this.createThemedSections();
    }

    /**
     * Define themed sections along the course
     */
    createThemedSections() {
        this.sections = [
            {
                name: "Peaceful Forest",
                startDistance: 0,
                endDistance: 400,
                fogColor: 0x87CEEB,
                fogDensity: 0.0001,
                ambientColor: 0xffffbb,
                directionalIntensity: 0.8,
                backgroundColor: 0x87CEEB,
                description: "Gentle waters, birdsong, tutorial zone"
            },
            {
                name: "Canyon Rapids",
                startDistance: 400,
                endDistance: 900,
                fogColor: 0xff8844,
                fogDensity: 0.001,
                ambientColor: 0xff9955,
                directionalIntensity: 1.0,
                backgroundColor: 0xcc7744,
                description: "Fast drops, tight turns, orange sunset canyon"
            },
            {
                name: "Dark Cave",
                startDistance: 900,
                endDistance: 1400,
                fogColor: 0x000011,
                fogDensity: 0.05,
                ambientColor: 0x2244ff,
                directionalIntensity: 0.2,
                backgroundColor: 0x000000,
                description: "Mysterious darkness, glowing crystals, suspense"
            },
            {
                name: "Lift Hill",
                startDistance: 1400,
                endDistance: 1750,
                fogColor: 0x87CEEB,
                fogDensity: 0.0005,
                ambientColor: 0xffffdd,
                directionalIntensity: 1.2,
                backgroundColor: 0x87CEEB,
                description: "Ascending to the heavens, epic vista, anticipation"
            },
            {
                name: "The Mega Drop",
                startDistance: 1750,
                endDistance: 1860,
                fogColor: 0xffffff,
                fogDensity: 0.002,
                ambientColor: 0xffffff,
                directionalIntensity: 1.5,
                backgroundColor: 0x87CEEB,
                description: "FREE FALL! The big one!"
            },
            {
                name: "Victory Lap",
                startDistance: 1860,
                endDistance: 2100,
                fogColor: 0xffdd88,
                fogDensity: 0.0003,
                ambientColor: 0xffffcc,
                directionalIntensity: 0.9,
                backgroundColor: 0x87CEEB,
                description: "Celebration, final score, gentle float"
            }
        ];

        console.log(`✅ Created ${this.sections.length} themed sections`);
    }

    /**
     * Get position on spline from t parameter (0.0 to 1.0)
     */
    getPointAt(t) {
        return this.spline.getPointAt(Math.max(0, Math.min(1, t)));
    }

    /**
     * Get tangent (direction) at position t
     */
    getTangentAt(t) {
        return this.spline.getTangentAt(Math.max(0, Math.min(1, t)));
    }

    /**
     * Convert distance (meters) to t parameter
     */
    distanceToT(distance) {
        return Math.max(0, Math.min(1, distance / this.totalLength));
    }

    /**
     * Convert t parameter to distance (meters)
     */
    tToDistance(t) {
        return t * this.totalLength;
    }

    /**
     * Get current section based on distance
     */
    getSectionAtDistance(distance) {
        for (let section of this.sections) {
            if (distance >= section.startDistance && distance < section.endDistance) {
                return section;
            }
        }
        return this.sections[this.sections.length - 1]; // Default to last section
    }

    /**
     * Calculate slope at position (for speed calculation)
     * Returns: negative = downhill, positive = uphill, 0 = flat
     */
    getSlopeAt(t, delta = 0.001) {
        const t1 = Math.max(0, t - delta);
        const t2 = Math.min(1, t + delta);

        const p1 = this.spline.getPointAt(t1);
        const p2 = this.spline.getPointAt(t2);

        const rise = p2.y - p1.y;
        const run = Math.sqrt(
            Math.pow(p2.x - p1.x, 2) +
            Math.pow(p2.z - p1.z, 2)
        );

        return rise / run; // Slope ratio
    }

    /**
     * Calculate recommended speed based on slope
     */
    getSpeedMultiplierAt(t) {
        const slope = this.getSlopeAt(t);

        if (slope > 0.15) {
            // Steep uphill (lift hill)
            return 0.3;
        } else if (slope > 0.05) {
            // Gentle uphill
            return 0.6;
        } else if (slope < -0.3) {
            // Steep downhill (big drops!)
            return 3.0;
        } else if (slope < -0.1) {
            // Medium downhill
            return 1.8;
        } else {
            // Flat water
            return 1.0;
        }
    }

    /**
     * Get banked turn rotation (for visual effect)
     * Positive = banking right, negative = banking left
     */
    getBankingAt(t, delta = 0.001) {
        const t1 = Math.max(0, t - delta);
        const t2 = Math.min(1, t + delta);

        const p1 = this.spline.getPointAt(t1);
        const p2 = this.spline.getPointAt(t2);

        const dx = p2.x - p1.x;

        // Banking proportional to lateral change
        return dx * 2.0; // Multiplier for visual effect
    }

    /**
     * Create visual debug line for the spline path
     */
    createDebugVisualization(scene) {
        const points = this.spline.getPoints(500);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
            color: 0xff00ff,
            linewidth: 2
        });
        const line = new THREE.Line(geometry, material);
        scene.add(line);

        // Add markers at waypoints
        const markerGeometry = new THREE.SphereGeometry(2, 8, 8);
        const markerMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });

        this.waypoints.forEach((waypoint, i) => {
            const marker = new THREE.Mesh(markerGeometry, markerMaterial);
            marker.position.copy(waypoint);
            scene.add(marker);
        });

        console.log('✅ Spline debug visualization added (magenta line + green waypoint markers)');
    }

    /**
     * Get curvature at position (how tight is the turn?)
     */
    getCurvatureAt(t) {
        // Higher curvature = tighter turn
        const tangent1 = this.getTangentAt(Math.max(0, t - 0.001));
        const tangent2 = this.getTangentAt(Math.min(1, t + 0.001));

        const angle = tangent1.angleTo(tangent2);
        return angle * 500; // Scale for visibility
    }
}
