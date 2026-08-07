/* ==========================================================================
   NABIL PROFILE INTERACTIONS (NEW INDEPENDENT FILE)
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
    
    // 1. Custom Cursor & Magnetic Hover Logic
    const dot = document.querySelector(".cursor-dot");
    const ring = document.querySelector(".cursor-ring");
    
    window.addEventListener("mousemove", (e) => {
        const x = e.clientX;
        const y = e.clientY;
        
        // Instant follow for dot
        dot.style.left = `${x}px`;
        dot.style.top = `${y}px`;
        
        // Smooth follow for ring
        ring.animate({
            left: `${x}px`,
            top: `${y}px`
        }, { duration: 400, fill: "forwards" });
    });

    // Cursor Expansion on Interactive Elements
    const interactives = document.querySelectorAll("a, button, .gallery-item");
    interactives.forEach(el => {
        el.addEventListener("mouseenter", () => ring.classList.add("cursor-hover"));
        el.addEventListener("mouseleave", () => ring.classList.remove("cursor-hover"));
    });

    // 2. Cinematic Scroll Reveals (Intersection Observer)
    const revealOptions = {
        threshold: 0.2,
        rootMargin: "0px 0px -100px 0px"
    };

    const scrollObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("is-visible");
                
                // Trigger Skill Bars if intersecting
                if (entry.target.classList.contains('skills-section')) {
                    const fills = entry.target.querySelectorAll('.skill-fill');
                    fills.forEach(fill => {
                        fill.style.width = fill.getAttribute('data-target');
                    });
                }
                
                // Only animate once
                if(!entry.target.classList.contains('lyrics-section')) {
                   observer.unobserve(entry.target); 
                }
            }
        });
    }, revealOptions);

    document.querySelectorAll('.fade-up, .story-text, .skills-section').forEach(el => {
        scrollObserver.observe(el);
    });

    // 3. Setup DVD Easter Egg (Disiapkan di awal agar bisa dipanggil tombol play)
    const dvdContainer = document.getElementById("dvd-container");
    const dvdLogo = document.getElementById("dvd-logo");
    let dvdX = 0, dvdY = 0;
    let dirX = 2, dirY = 2;
    let dvdAnimId; // Untuk menyimpan ID animasi agar bisa di-pause

    function animateDVD() {
        const boxRect = dvdContainer.getBoundingClientRect();
        const logoRect = dvdLogo.getBoundingClientRect();

        dvdX += dirX;
        dvdY += dirY;

        if (dvdX + logoRect.width >= boxRect.width || dvdX <= 0) {
            dirX *= -1;
            changeColor();
        }
        if (dvdY + logoRect.height >= boxRect.height || dvdY <= 0) {
            dirY *= -1;
            changeColor();
        }

        dvdLogo.style.transform = `translate(${dvdX}px, ${dvdY}px)`;
        dvdAnimId = requestAnimationFrame(animateDVD);
    }

    function changeColor() {
        const colors = ['#DC5000', '#F6E0C6', '#6C5F51', '#00F0FF'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        dvdLogo.style.color = randomColor;
        dvdLogo.style.borderColor = randomColor;
        dvdLogo.style.textShadow = `0 0 10px ${randomColor}`;
        dvdLogo.style.boxShadow = `inset 0 0 20px ${randomColor}33, 0 0 20px ${randomColor}33`;
    }

    // 4. Audio Player & Integrasi Animasi DVD
    const playBtn = document.getElementById("play-btn");
    const audio = document.getElementById("bgm-audio");
    const playIcon = document.querySelector(".play-icon");
    const pauseIcon = document.querySelector(".pause-icon");
    const albumArt = document.querySelector(".album-art");
    const waveform = document.querySelector(".waveform");

    let isPlaying = false;

    function setPlayingUI() {
        playIcon.style.display = "none";
        pauseIcon.style.display = "inline";
        albumArt.classList.add("playing");
        waveform.classList.add("playing");

        // Jalankan animasi DVD saat musik main
        animateDVD();
    }

    function setPausedUI() {
        playIcon.style.display = "inline";
        pauseIcon.style.display = "none";
        albumArt.classList.remove("playing");
        waveform.classList.remove("playing");

        // Hentikan animasi DVD saat musik pause
        cancelAnimationFrame(dvdAnimId);
    }

    playBtn.addEventListener("click", () => {
        if (!isPlaying) {
            // UI baru pindah ke status "playing" SETELAH audio.play() benar-benar
            // berhasil, supaya tombol tidak terlihat "jalan" kalau file MP3-nya
            // gagal dimuat (mis. path salah / 404 / diblokir browser).
            audio.play()
                .then(() => {
                    isPlaying = true;
                    setPlayingUI();
                })
                .catch((err) => {
                    console.error("Audio gagal diputar. Cek path file MP3-nya:", audio.currentSrc || audio.src, err);
                });
        } else {
            audio.pause();
            isPlaying = false;
            setPausedUI();
        }
    });

    // Bantuan debug: tampil di console kalau <audio> gagal memuat sumbernya
    audio.addEventListener("error", () => {
        console.error("Elemen <audio> gagal memuat sumber:", audio.currentSrc || audio.src);
    });

    // 5. Auto-Sync Lyrics Experience (.lrc Parser)
    const lyricsContainer = document.getElementById("lyrics-container");
    let lyricLines = [];

    async function fetchAndParseLyrics() {
        try {
            // PASTIKAN NAMA DAN LOKASI FILE .LRC KAMU BENAR DI SINI
            const response = await fetch("assets/lyrics/The Neighbourhood - Softcore.lrc");
            if (!response.ok) {
                throw new Error(`File lirik tidak ditemukan (status ${response.status})`);
            }
            const lrcText = await response.text();

            const lines = lrcText.split("\n");
            // Regex global: mendukung baris dengan lebih dari satu timestamp,
            // contoh format .lrc: [00:12.34][00:45.67]Lirik yang sama
            const timeTagRegex = /\[(\d{2}):(\d{2}(?:\.\d{1,3})?)\]/g;
            const entries = [];

            lines.forEach(line => {
                const tags = [...line.matchAll(timeTagRegex)];
                if (tags.length === 0) return;

                const text = line.replace(timeTagRegex, "").trim();
                if (!text) return;

                tags.forEach(tag => {
                    const totalTime = (parseInt(tag[1]) * 60) + parseFloat(tag[2]);
                    entries.push({ time: totalTime, text });
                });
            });

            // Urutkan berdasarkan waktu supaya auto-sync tetap akurat
            // walaupun urutan baris di file .lrc tidak kronologis
            entries.sort((a, b) => a.time - b.time);

            entries.forEach(entry => {
                const p = document.createElement("p");
                p.className = "lyric-line";
                p.setAttribute("data-time", entry.time);
                p.innerText = entry.text;
                lyricsContainer.appendChild(p);
            });

            lyricLines = document.querySelectorAll(".lyric-line");

        } catch (error) {
            console.error("Gagal memuat lirik:", error);
            lyricsContainer.innerHTML = "<p class='lyric-line'>Lirik tidak ditemukan.</p>";
        }
    }

    if (lyricsContainer) {
        fetchAndParseLyrics();
    }

    if (audio) {
        audio.addEventListener("timeupdate", () => {
            const currentTime = audio.currentTime;
            let activeIndex = -1;

            // Cari lirik aktif sesuai waktu musik
            for (let i = 0; i < lyricLines.length; i++) {
                const lineTime = parseFloat(lyricLines[i].getAttribute("data-time"));
                if (currentTime >= lineTime) {
                    activeIndex = i;
                } else {
                    break;
                }
            }

            // Animasi scroll dan nyala
            lyricLines.forEach((line, index) => {
                if (index === activeIndex) {
                    line.classList.add("active");
                    
                    // Dorong teks naik agar lirik aktif selalu di tengah
                    const lineOffset = line.offsetTop + (line.offsetHeight / 2);
                    lyricsContainer.style.transform = `translateY(-${lineOffset}px)`;
                } else {
                    line.classList.remove("active");
                }
            });
        });
    }
});