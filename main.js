document.addEventListener("DOMContentLoaded", () => {
    /* ══════════════════════════════════
       SMOOTH SCROLL (LENIS)
    ══════════════════════════════════ */
    const lenis = new Lenis();
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => {
        lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);

    /* ══════════════════════════════════
       SECTION TRANSITIONS (OBSERVER)
    ══════════════════════════════════ */
    const observerOptions = { threshold: 0.12 };
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    document.querySelectorAll('section').forEach(section => {
        observer.observe(section);
    });

    /* ══════════════════════════════════
       GSAP CORE ANIMATIONS
    ══════════════════════════════════ */
    gsap.registerPlugin(ScrollTrigger);

    // Hero Entrance
    const heroTL = gsap.timeline({ delay: 0.2 });
    heroTL.from('.hero .word', {
        y: 80, opacity: 0, rotateX: -30, stagger: 0.12, duration: 1.1, ease: 'power4.out', transformPerspective: 600
    })
        .from('.hero p', { y: 30, opacity: 0, duration: 0.9, ease: 'power3.out' }, '-=0.5')
        .from('.hero-btns .btn', { y: 24, opacity: 0, stagger: 0.15, duration: 0.8, ease: 'power3.out' }, '-=0.5')
        .from('.hero-card', { boxShadow: '0 0 0 rgba(244,227,178,0)', duration: 1.5, ease: 'power2.out' }, '-=1');

    // Section Header Reveals
    document.querySelectorAll('h2').forEach(h => {
        gsap.from(h, { scrollTrigger: { trigger: h, start: 'top 85%' }, y: 50, opacity: 0, skewY: 2, duration: 1.1, ease: 'power4.out' });
    });

    gsap.from('#services .card', {
        scrollTrigger: { trigger: '#services', start: 'top 78%' }, y: 80, opacity: 0, stagger: 0.15, duration: 1.2, ease: 'power4.out'
    });

    // Parallax Effects
    gsap.to('.hero-card', { yPercent: -18, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1.4 } });
    gsap.to('.bg-gradient', { yPercent: 12, ease: 'none', scrollTrigger: { trigger: 'body', start: 'top top', end: 'bottom bottom', scrub: 2 } });

    /* ══════════════════════════════════
       MAGNETIC & TILT EFFECTS
    ══════════════════════════════════ */
    document.querySelectorAll('.magnetic').forEach(btn => {
        btn.addEventListener('mousemove', e => {
            const r = btn.getBoundingClientRect();
            const x = e.clientX - r.left - r.width / 2;
            const y = e.clientY - r.top - r.height / 2;
            gsap.to(btn, { x: x * 0.35, y: y * 0.35, duration: 0.4, ease: 'power3.out' });
        });
        btn.addEventListener('mouseleave', () => {
            gsap.to(btn, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1,0.4)' });
        });
    });

    document.querySelectorAll('.tilt-card').forEach(card => {
        card.addEventListener('mousemove', e => {
            const r = card.getBoundingClientRect();
            const x = (e.clientX - r.left) / r.width - 0.5;
            const y = (e.clientY - r.top) / r.height - 0.5;
            gsap.to(card, { rotateY: x * 14, rotateX: -y * 14, transformPerspective: 800, duration: 0.5, ease: 'power2.out' });
        });
        card.addEventListener('mouseleave', () => {
            gsap.to(card, { rotateY: 0, rotateX: 0, duration: 0.7, ease: 'elastic.out(1,0.5)' });
        });
    });

    /* ══════════════════════════════════
       FORM SUBMISSION
    ══════════════════════════════════ */
    const form = document.getElementById('contactForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = form.querySelector('button');
            const originalText = submitBtn.innerText;
            submitBtn.innerText = 'Transmitting...';
            submitBtn.disabled = true;

            const formData = {
                name: form.name.value,
                email: form.email.value,
                message: form.message.value,
                plan: document.getElementById('plan-select').value
            };

            try {
                const res = await fetch('http://localhost:5000/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
                if (res.ok) {
                    alert('Alchemy complete. Lead received.');
                    form.reset();
                } else {
                    alert('Submission failed.');
                }
            } catch (err) {
                alert('Backend Offline.');
            } finally {
                submitBtn.innerText = originalText;
                submitBtn.disabled = false;
            }
        });
    }

    // Smooth Scroll Buttons
    document.getElementById('btn-start')?.addEventListener('click', () => lenis.scrollTo('#contact'));
    document.getElementById('btn-view')?.addEventListener('click', () => lenis.scrollTo('#services'));
});

