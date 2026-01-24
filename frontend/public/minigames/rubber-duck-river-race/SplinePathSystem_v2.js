import * as THREE from 'three';

/**
 * 🎢 SPLINE PATH SYSTEM v2 - With MEGA STEEP DROP!
 */

export class SplinePathSystem {
    constructor() {
        this.spline = null;
        this.totalLength = 0;
        this.sections = [];
        this.waypoints = [];

        this.createLogFlumeCoursePath();
    }

    createLogFlumeCoursePath() {
        console.log('🎢 Building EXTREME Log Flume Course...');

        // Progressive drops with FLAT sections - drops lengthened to 40 z-units to prevent uphill curve
        this.waypoints = [
            // Start - FLAT
            new THREE.Vector3(0, 100, 0),
            new THREE.Vector3(-5, 100, -100),
            new THREE.Vector3(5, 100, -200),

            // DROP #1 - 10ft over 40 units (with intermediate waypoints for linear descent)
            new THREE.Vector3(0, 100, -210),    // Start of drop
            new THREE.Vector3(0, 95, -230),     // Mid drop
            new THREE.Vector3(0, 90, -250),     // End of drop

            // FLAT
            new THREE.Vector3(-5, 90, -300),
            new THREE.Vector3(5, 90, -400),

            // DROP #2 - 15ft over 40 units (with intermediate waypoints for linear descent)
            new THREE.Vector3(0, 90, -410),     // Start of drop
            new THREE.Vector3(0, 82.5, -430),   // Mid drop
            new THREE.Vector3(0, 75, -450),     // End of drop

            // FLAT
            new THREE.Vector3(-5, 75, -500),
            new THREE.Vector3(5, 75, -600),

            // DROP #3 - 20ft over 40 units (with intermediate waypoints for linear descent)
            new THREE.Vector3(0, 75, -610),     // Start of drop
            new THREE.Vector3(0, 65, -630),     // Mid drop
            new THREE.Vector3(0, 55, -650),     // End of drop

            // FLAT
            new THREE.Vector3(-5, 55, -700),
            new THREE.Vector3(5, 55, -800),

            // DROP #4 - 25ft over 40 units (with intermediate waypoints for linear descent)
            new THREE.Vector3(0, 55, -810),     // Start of drop
            new THREE.Vector3(0, 42.5, -830),   // Mid drop
            new THREE.Vector3(0, 30, -850),     // End of drop

            // FLAT
            new THREE.Vector3(-5, 30, -900),
            new THREE.Vector3(5, 30, -1000),

            // DROP #5 - 30ft over 40 units (with intermediate waypoints for linear descent)
            new THREE.Vector3(0, 30, -1010),    // Start of drop
            new THREE.Vector3(0, 15, -1030),    // Mid drop
            new THREE.Vector3(0, 0, -1050),     // End of drop

            // FLAT
            new THREE.Vector3(-5, 0, -1100),
            new THREE.Vector3(5, 0, -1200),

            // DROP #6 - 40ft over 40 units (with intermediate waypoints for linear descent)
            new THREE.Vector3(0, 0, -1210),     // Start of drop
            new THREE.Vector3(0, -20, -1230),   // Mid drop
            new THREE.Vector3(0, -40, -1250),   // End of drop

            // FLAT - anchor point right after drop
            new THREE.Vector3(0, -40, -1270),   // Anchor to prevent overshoot
            new THREE.Vector3(-5, -40, -1300),
            new THREE.Vector3(5, -40, -1400),

            // DROP #7 - MEGA 60ft over 50 units (with intermediate waypoints for linear descent)
            new THREE.Vector3(0, -40, -1410),   // Start of drop
            new THREE.Vector3(0, -60, -1430),   // 1/3 drop
            new THREE.Vector3(0, -80, -1445),   // 2/3 drop
            new THREE.Vector3(0, -100, -1460),  // End of drop

            // FLAT to finish - EXTRA waypoints right after drop to prevent overshoot
            new THREE.Vector3(0, -100, -1480),  // Anchor point
            new THREE.Vector3(-5, -100, -1550),
            new THREE.Vector3(0, -100, -1700),
            new THREE.Vector3(5, -100, -1850),
            new THREE.Vector3(0, -100, -2000),  // FINISH LINE!

            // COOL-DOWN ZONE - Continue river beyond finish for 500m
            new THREE.Vector3(-5, -100, -2100),
            new THREE.Vector3(5, -100, -2200),
            new THREE.Vector3(0, -100, -2300),
            new THREE.Vector3(-8, -100, -2400),  // Start gentle curve
            new THREE.Vector3(-12, -100, -2500)  // End - river curves behind canyon wall
        ];

        // NO transformations - waypoints used as-is

        // Create initial Catmull-Rom spline
        const rawSpline = new THREE.CatmullRomCurve3(this.waypoints);
        rawSpline.curveType = 'chordal';
        rawSpline.tension = 0;
        rawSpline.closed = false;

        // 🔥 CRITICAL FIX: Post-process spline to FORCE downhill-only flow
        // Sample the spline densely, then clamp Y values to eliminate uphill sections
        console.log('🔧 Post-processing spline to enforce downhill-only flow...');
        const rawPoints = rawSpline.getPoints(2000);
        const clampedPoints = [rawPoints[0]];
        let minYSoFar = rawPoints[0].y;
        let clampedCount = 0;

        for (let i = 1; i < rawPoints.length; i++) {
            const point = rawPoints[i].clone();
            if (point.y > minYSoFar) {
                point.y = minYSoFar;
                clampedCount++;
            } else {
                minYSoFar = point.y;
            }
            clampedPoints.push(point);
        }

        console.log(`🔧 Clamped ${clampedCount} uphill points out of ${rawPoints.length}`);

        // Create a NEW Catmull-Rom spline from the clamped points
        this.spline = new THREE.CatmullRomCurve3(clampedPoints);
        this.spline.curveType = 'chordal';
        this.spline.tension = 0;
        this.spline.closed = false;

        this.totalLength = this.spline.getLength();

        console.log(`✅ EXTREME Spline created: ${clampedPoints.length} clamped points, ${this.totalLength.toFixed(0)}m long`);

        this.createThemedSections();
    }

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
                name: "The MEGA Drop",
                startDistance: 1750,
                endDistance: 1860,
                fogColor: 0xffffff,
                fogDensity: 0.002,
                ambientColor: 0xffffff,
                directionalIntensity: 1.5,
                backgroundColor: 0x87CEEB,
                description: "75-FOOT FREE FALL! The ultimate thrill!"
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

    getPointAt(t) {
        return this.spline.getPointAt(Math.max(0, Math.min(1, t)));
    }

    getTangentAt(t) {
        return this.spline.getTangentAt(Math.max(0, Math.min(1, t)));
    }

    distanceToT(distance) {
        return Math.max(0, Math.min(1, distance / this.totalLength));
    }

    tToDistance(t) {
        return t * this.totalLength;
    }

    getSectionAtDistance(distance) {
        for (let section of this.sections) {
            if (distance >= section.startDistance && distance < section.endDistance) {
                return section;
            }
        }
        return this.sections[this.sections.length - 1];
    }

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

        return rise / run;
    }

    getSpeedMultiplierAt(t) {
        const slope = this.getSlopeAt(t);

        if (slope > 0.15) {
            return 0.3; // Steep uphill (lift hill)
        } else if (slope > 0.05) {
            return 0.6; // Gentle uphill
        } else if (slope < -0.5) {
            return 4.0; // MEGA STEEP DROP!!!
        } else if (slope < -0.3) {
            return 3.0; // Steep downhill
        } else if (slope < -0.1) {
            return 1.8; // Medium downhill
        } else {
            return 1.0; // Flat water
        }
    }

    getBankingAt(t, delta = 0.001) {
        const t1 = Math.max(0, t - delta);
        const t2 = Math.min(1, t + delta);

        const p1 = this.spline.getPointAt(t1);
        const p2 = this.spline.getPointAt(t2);

        const dx = p2.x - p1.x;
        return dx * 2.0;
    }

    createDebugVisualization(scene) {
        const points = this.spline.getPoints(500);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
            color: 0xff00ff,
            linewidth: 2
        });
        const line = new THREE.Line(geometry, material);
        scene.add(line);

        const markerGeometry = new THREE.SphereGeometry(2, 8, 8);
        const markerMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });

        this.waypoints.forEach((waypoint, i) => {
            const marker = new THREE.Mesh(markerGeometry, markerMaterial);
            marker.position.copy(waypoint);
            scene.add(marker);
        });

        console.log('✅ Spline debug visualization added');
    }

    getCurvatureAt(t) {
        const tangent1 = this.getTangentAt(Math.max(0, t - 0.001));
        const tangent2 = this.getTangentAt(Math.min(1, t + 0.001));

        const angle = tangent1.angleTo(tangent2);
        return angle * 500;
    }
}
