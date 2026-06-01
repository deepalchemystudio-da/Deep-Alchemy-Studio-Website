document.addEventListener("DOMContentLoaded", () => {
    const cursor = document.getElementById("cursor");
    const ring = document.getElementById("cursor-ring");

    if (!cursor || !ring) return;

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let ringX = mouseX;
    let ringY = mouseY;

    // Track mouse
    document.addEventListener("mousemove", (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;

        // Instant dot movement with center offset
        cursor.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`;
    });

    // Smooth ring animation loop
    function animate() {
        ringX += (mouseX - ringX) * 0.15;
        ringY += (mouseY - ringY) * 0.15;

        ring.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
        requestAnimationFrame(animate);
    }
    animate();

    // Universal hover expansion
    const updateHoverElements = () => {
        const hoverElements = document.querySelectorAll(
            "a, button, .card, .project, .price-cta, .chatbot-btn, .chatbot-toggle-btn, .menu-item, .menu-toggle, input, textarea, select"
        );

        hoverElements.forEach(el => {
            // Remove any existing listeners to prevent duplication if called multiple times
            el.removeEventListener("mouseenter", expandCursor);
            el.removeEventListener("mouseleave", shrinkCursor);
            
            el.addEventListener("mouseenter", expandCursor);
            el.addEventListener("mouseleave", shrinkCursor);
        });
    };

    function expandCursor() {
        ring.classList.add('expand');
    }

    function shrinkCursor() {
        ring.classList.remove('expand');
    }

    // Initial run
    updateHoverElements();

    // Re-run if dynamic elements are added (like in chatbot)
    window.addEventListener('updateCursor', updateHoverElements);
});
