// Animal Ball Run - Ball Physics System
// Color-coded bouncing balls with strategic gameplay

const BALL_TYPES = {
    green: {
        name: 'Safe Ball',
        color: 0x00FF00,
        bounceMultiplier: 1.0,
        description: 'Low bounce - precise, safe landings'
    },
    blue: {
        name: 'Standard Ball',
        color: 0x0066FF,
        bounceMultiplier: 1.5,
        description: 'Medium bounce - balanced gameplay'
    },
    yellow: {
        name: 'Power Ball',
        color: 0xFFFF00,
        bounceMultiplier: 2.0,
        description: 'High bounce - long gaps and speed'
    },
    red: {
        name: 'Super Ball',
        color: 0xFF0000,
        bounceMultiplier: 3.0,
        description: 'Extreme bounce - risky shortcuts'
    },
    purple: {
        name: 'Sticky Ball',
        color: 0x9370DB,
        bounceMultiplier: 0.5,
        description: 'Dampened bounce - safe zones'
    }
};

const PERFECT_BOUNCE_WINDOW = 0.15; // 150ms timing window
const PERFECT_BOUNCE_MULTIPLIER = 1.3;

class BallPhysicsManager {
    constructor() {
        this.balls = [];
        this.lastBallContact = null;
        this.lastContactTime = 0;
        this.comboCount = 0;
    }

    createBall(position, type = 'blue', radius = 1) {
        const ballType = BALL_TYPES[type] || BALL_TYPES.blue;

        // Create visual ball
        const geometry = new THREE.SphereGeometry(radius, 32, 32);
        const material = new THREE.MeshPhongMaterial({
            color: ballType.color,
            shininess: 100,
            emissive: ballType.color,
            emissiveIntensity: 0.2
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(position);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        const ball = {
            mesh: mesh,
            type: type,
            bounceMultiplier: ballType.bounceMultiplier,
            radius: radius,
            position: position,
            isGlowing: false,
            originalEmissive: ballType.color
        };

        this.balls.push(ball);
        return ball;
    }

    checkBallCollision(playerPosition, playerVelocity, playerRadius = 0.5) {
        let collision = null;

        for (let ball of this.balls) {
            const distance = playerPosition.distanceTo(ball.position);
            const collisionThreshold = ball.radius + playerRadius + 1.5; // Much more forgiving

            // Check if player is landing on top of ball
            if (distance < collisionThreshold && playerVelocity.y < 0) {
                // Landing on ball from above (very forgiving vertical check)
                const ballTop = ball.position.y + ball.radius;
                const playerBottom = playerPosition.y - playerRadius;

                if (Math.abs(playerBottom - ballTop) < 3.0) { // Increased from 0.5 to 3.0
                    collision = ball;
                    break;
                }
            }
        }

        return collision;
    }

    applyBounce(ball, playerVelocity, currentTime) {
        // Base bounce from ball type
        let bounceForce = ball.bounceMultiplier * 0.3;

        // Check for perfect bounce timing
        const timeSinceLastBounce = currentTime - this.lastContactTime;
        const isPerfectBounce = timeSinceLastBounce > 0.1 && timeSinceLastBounce < PERFECT_BOUNCE_WINDOW + 0.1;

        if (isPerfectBounce) {
            bounceForce *= PERFECT_BOUNCE_MULTIPLIER;
            this.createPerfectBounceEffect(ball);
            this.comboCount++;
        } else if (ball !== this.lastBallContact) {
            // Reset combo if timing is off
            this.comboCount = 0;
        }

        // Apply bounce to player velocity
        playerVelocity.y = bounceForce;

        // Bounce animation for ball
        this.animateBallBounce(ball);

        // Track last contact
        this.lastBallContact = ball;
        this.lastContactTime = currentTime;

        return {
            bounceForce: bounceForce,
            isPerfect: isPerfectBounce,
            combo: this.comboCount
        };
    }

    animateBallBounce(ball) {
        // Squash and stretch animation
        const originalScale = new THREE.Vector3(1, 1, 1);
        const squashScale = new THREE.Vector3(1.1, 0.9, 1.1);

        ball.mesh.scale.copy(squashScale);

        // Reset scale after animation
        setTimeout(() => {
            ball.mesh.scale.copy(originalScale);
        }, 100);
    }

    createPerfectBounceEffect(ball) {
        // Visual feedback for perfect bounce
        ball.mesh.material.emissiveIntensity = 0.8;

        setTimeout(() => {
            ball.mesh.material.emissiveIntensity = 0.2;
        }, 200);
    }

    updateBallGlow(playerPosition, glowRadius = 3) {
        // Highlight balls near player
        for (let ball of this.balls) {
            const distance = playerPosition.distanceTo(ball.position);

            if (distance < glowRadius) {
                if (!ball.isGlowing) {
                    ball.mesh.material.emissiveIntensity = 0.5;
                    ball.isGlowing = true;
                }
            } else {
                if (ball.isGlowing) {
                    ball.mesh.material.emissiveIntensity = 0.2;
                    ball.isGlowing = false;
                }
            }
        }
    }

    resetCombo() {
        this.comboCount = 0;
    }

    getCombo() {
        return this.comboCount;
    }

    addBallsToScene(scene) {
        for (let ball of this.balls) {
            scene.add(ball.mesh);
        }
    }

    clearBalls(scene) {
        for (let ball of this.balls) {
            scene.remove(ball.mesh);
        }
        this.balls = [];
    }
}
