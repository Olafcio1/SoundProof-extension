// Platform check - only run on YouTube Music
if (!window.location.hostname.includes('music.youtube.com')) {
    console.warn('YtMusic.js loaded on wrong platform:', window.location.hostname);
    throw new Error('YtMusic.js is only for YouTube Music');
}

console.log("loaded on youtube music!")

let currentArtist = null;
let currentTitle = null;

const nextButton = document.querySelector('tp-yt-paper-icon-button[aria-label="Next song"]') || document.querySelector('.next-button');

function checkAndUpdateBadge() {
    const artistElement = document.querySelector('.subtitle.ytmusic-player-bar a');
    const titleElement = document.querySelector('.title.ytmusic-player-bar');
    
    if (artistElement && titleElement) {
        var newArtist = artistElement.textContent.trim();
        var newTitle  = titleElement.textContent.trim();

        const copyartist=newArtist;
        const copytitle=newTitle;

        try {
            //declared in ./YtMusic/Hubs.txt
            if (hubs.includes(artistElement.href.split("/").reverse()[0]) && newTitle.includes("-")) {
                let split = newTitle.split("-");

                newArtist = split[0].split(",")[0].trim();
                newTitle = split[1].trim();
            }
        } catch (e) {
            console.warn(`Song cannot be resolved as multichannel (${copyartist} - ${copyTitle}):`, e);
        }

        if (newArtist !== currentArtist || newTitle !== currentTitle) {
            console.log("Song changed:", currentTitle, "by", currentArtist, "->", newTitle, "by", newArtist);

            currentArtist = newArtist;
            currentTitle = newTitle;

            DecideBadge(
                '90px', '50px',
                { artist: '.subtitle.ytmusic-player-bar a', title: '.title.ytmusic-player-bar' },
                '#left-controls > span',
                nextButton,
                'auto', 'music'
            );
        }
    }
}

function observePlayerBar() {
    const playerBar = document.querySelector('ytmusic-player-bar');
    
    if (playerBar) {
        const observer = new MutationObserver(() => {
            checkAndUpdateBadge();
        });
        
        observer.observe(playerBar, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true
        });
        
        const videoElement = document.querySelector('video');
        if (videoElement) {
            let lastCheck = 0;
            videoElement.addEventListener('timeupdate', () => {
                if (videoElement.currentTime - lastCheck > 2 || videoElement.currentTime < lastCheck) {
                    lastCheck = videoElement.currentTime;
                    checkAndUpdateBadge();
                }
            });
        }
        
        // Initial check
        checkAndUpdateBadge();
    } else {
        setTimeout(observePlayerBar, 500);
    }
}

observePlayerBar();

async function getArtistNameByURL(href) {
    //TODO Text decoding
    return (await (await fetch(href)).text()).split("<title>")[1].split("<")[0];
}

(function addToContextMenu() {
    let ctx;

    function addMe() {
        let channelLink = ctx.querySelector(`#navigation-endpoint[href^="channel/"]`)?.href;
        if (!channelLink)
            return;

        let aivote = ctx.querySelector("#soundproof-menu-vote") ||
                     document.createElement("ytmusic-menu-service-item-renderer");

        aivote.className = "style-scope ytmusic-menu-popup-renderer";
        aivote.role = "menuitem";
        aivote.tabindex = "-1";
        aivote.ariaDisabled = "false";
        aivote.ariaSelected = "false";
        aivote.id = "soundproof-menu-vote";
        //!!TODO Replace icon
        aivote.innerHTML = `

            <!--css-build:shady-->
            <!--css-build:shady-->
            <yt-icon class="icon style-scope ytmusic-menu-service-item-renderer" style="width: 18px; height: 18px;">
                <!--css-build:shady-->
                <!--css-build:shady-->
            </yt-icon>
            <yt-formatted-string class="text style-scope ytmusic-menu-service-item-renderer"></yt-formatted-string>

        `;

        setTimeout(() => {
            aivote.querySelector("yt-icon").innerHTML = `
                <span class="yt-icon-shape style-scope yt-icon ytSpecIconShapeHost">
                    <div style="width: 100%; height: 100%; display: block; fill: currentcolor;">
                        <svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 0 18 18" width="18" focusable="false" aria-hidden="true" style="pointer-events: none; display: inherit; width: 100%; height: 100%;">
                            <path d="M15.153 1.508 15 1.5H3A1.5 1.5 0 001.5 3v12l.008.153A1.5 1.5 0 003 16.5h12l.153-.008a1.5 1.5 0 001.34-1.339L16.5 15V3a1.5 1.5 0 00-1.347-1.492ZM3 15V3h12v12H3Zm6-9.75a.75.75 0 00-.75.75v6.75h1.5V6A.75.75 0 009 5.25ZM6 7.5a.75.75 0 00-.75.75v4.5h1.5v-4.5A.75.75 0 006 7.5ZM12 9a.75.75 0 00-.75.75v3h1.5v-3A.75.75 0 0012 9Z"></path>
                        </svg>
                    </div>
                </span>
            `;

            aivote.querySelector("yt-formatted-string").innerText = 'Vote as AI';
            aivote.querySelector("yt-formatted-string").style.display = 'block!important';
            aivote.querySelector("yt-formatted-string").removeAttribute('is-empty');
        }, 100);

        aivote.addEventListener("click", async () => {
            try {
                const { error } = await window.supabaseClient.rpc('handle_vote', {
                    artist_id_input: await getArtistNameByURL(channelLink),
                    vote_type_input: 'ai',
                    platform_input: 'music'
                });

                if (error) console.error('[SoundProof] handle_vote_in_menu error:', error);

                //showPopup call removed
            } catch (err) {
                console.error('[SoundProof] Vote failed:', err);
            }
        }, { once: true });

        ctx.querySelector("tp-yt-paper-listbox").append(aivote);
    }

    //I know I could use a MutationObserver, but that's laggy.
    addEventListener("mousedown", async ev => {
        if (ev.button == 0 || ev.button == 2) {
            if (ctx) {
                setTimeout(() => {
                    addMe();
                }, 100);
            } else {
                var i = setInterval(() => {
                    ctx = document.querySelector("ytmusic-menu-popup-renderer");

                    if (ctx) {
                        clearInterval(i);
                        addMe();
                    }
                }, 60);
            }
        }
    });
})();
