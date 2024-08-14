<!DOCTYPE html>
<html lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>تفاصيل الأنمي</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.0.0/crypto-js.min.js"></script>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            background-color: #121212; /* لون خلفية داكنة */
            color: #e0e0e0; /* لون نص فاتح */
            margin: 0;
            padding: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
        }
        .container {
            max-width: 90%;
            width: 800px;
            background: #1e1e1e; /* لون خلفية الحاوية داكن */
            border-radius: 15px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
            margin: 20px auto;
            padding: 20px;
            box-sizing: border-box;
            transition: transform 0.3s, box-shadow 0.3s;
        }
        .container:hover {
            transform: scale(1.02);
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.7);
        }
        h1 {
            color: #f1f1f1;
            margin-bottom: 10px;
        }
        img {
            max-width: 100%;
            border-radius: 15px;
            margin-bottom: 15px;
        }
        p {
            color: #b0b0b0;
            line-height: 1.6;
        }
        .buttons {
            margin: 20px 0;
        }
        .buttons button {
            background: #333;
            color: #e0e0e0;
            border: none;
            border-radius: 5px;
            padding: 10px 20px;
            margin: 5px;
            cursor: pointer;
            font-size: 16px;
            transition: background 0.3s, transform 0.3s;
        }
        .buttons button.active {
            background: #555;
        }
        .buttons button:hover {
            background: #555;
            transform: scale(1.05);
        }
        video {
            width: 100%;
            height: 400px;
            border-radius: 15px;
            background: #000;
            margin-bottom: 20px;
        }
        @media (max-width: 768px) {
            .container {
                width: 95%;
            }
            video {
                height: 300px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1 id="anime-name">اسم الأنمي</h1>
        <img id="anime-image" alt="صورة الأنمي">
        <p id="anime-description">وصف الأنمي</p>
        <div class="buttons" id="episode-buttons"></div>
        <video id="video-player" controls preload="metadata"></video>
    </div>

    <script>
        const encryptionKey = 'd3f9a1c4b8e2f6c3a7b5d6e4f2c8a9d0d3f9a1c4b8e2f6c3a7b5d6e4f2c8a9d0';

        function decrypt(encryptedText) {
            const [ivHex, encryptedHex] = encryptedText.split(':');
            const iv = CryptoJS.enc.Hex.parse(ivHex);
            const encrypted = CryptoJS.enc.Hex.parse(encryptedHex);

            const decrypted = CryptoJS.AES.decrypt(
                { ciphertext: encrypted },
                CryptoJS.enc.Hex.parse(encryptionKey),
                { iv: iv }
            );

            return decrypted.toString(CryptoJS.enc.Utf8);
        }

        function parseQuery(queryString) {
            const params = new URLSearchParams(queryString);
            const data = params.get('q');
            if (!data) {
                document.body.innerHTML = '<h1>رابط غير صحيح</h1>';
                return null;
            }
            const decryptedQuery = decrypt(data);
            return new URLSearchParams(decryptedQuery);
        }

        function displayAnimeData(queryParams) {
            if (!queryParams) return;

            document.getElementById('anime-name').textContent = queryParams.get('Anime');
            document.getElementById('anime-image').src = queryParams.get('Image');
            document.getElementById('anime-description').textContent = queryParams.get('Description');

            const episodeButtons = document.getElementById('episode-buttons');
            const videoPlayer = document.getElementById('video-player');

            let episodeIndex = 0;
            const episodes = [];

            queryParams.forEach((value, key) => {
                if (key.startsWith('ep')) {
                    episodes.push({ index: key.replace('ep', ''), url: value });
                }
            });

            function updateVideo(index) {
                episodeIndex = index;
                const videoUrl = episodes[index].url;
                fetch(videoUrl)
                    .then(response => response.blob())
                    .then(blob => {
                        const objectUrl = URL.createObjectURL(blob);
                        videoPlayer.src = objectUrl;
                        videoPlayer.currentTime = localStorage.getItem(`video-current-time-${episodeIndex}`) || 0;
                        const buttons = episodeButtons.querySelectorAll('button');
                        buttons.forEach(btn => btn.classList.remove('active'));
                        buttons[index].classList.add('active');
                    });
            }

            videoPlayer.addEventListener('timeupdate', () => {
                localStorage.setItem(`video-current-time-${episodeIndex}`, videoPlayer.currentTime);
            });

            episodes.forEach((episode, index) => {
                const button = document.createElement('button');
                button.textContent = `حلقة ${episode.index}`;
                button.onclick = () => updateVideo(index);
                episodeButtons.appendChild(button);
            });

            if (episodes.length > 0) {
                updateVideo(0);
            }
        }

        function init() {
            const decryptedParams = parseQuery(window.location.search.substring(1));
            if (decryptedParams) {
                displayAnimeData(decryptedParams);
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        }

        init();
    </script>
</body>
</html>