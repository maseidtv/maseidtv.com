const buttons = document.querySelectorAll('.track-click');
const statusBanner = document.getElementById('statusBanner');
const subscriberCount = document.getElementById('subscriberCount');
const videoCount = document.getElementById('videoCount');

buttons.forEach((button) => {
  button.addEventListener('click', () => {
    statusBanner.textContent = 'YouTube kanalına yönlendiriliyorsun...';
    window.setTimeout(() => {
      statusBanner.textContent = 'MaseidTV kanalını takip etmeyi unutma!';
    }, 1800);
  });
});

function parseDataText(text) {
  const data = {};
  text.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const [key, ...rest] = trimmed.split('=');
    if (!key || rest.length === 0) return;
    data[key.trim()] = rest.join('=').trim();
  });
  return data;
}

function updateStatsFromFile() {
  fetch('data.txt')
    .then((response) => {
      if (!response.ok) {
        throw new Error('Data dosyası yüklenemedi');
      }
      return response.text();
    })
    .then((text) => {
      const data = parseDataText(text);
      if (data.abone) {
        subscriberCount.textContent = data.abone;
      }
      if (data.video) {
        videoCount.textContent = data.video;
      }
    })
    .catch(() => {
      subscriberCount.textContent = 'Güncelleme başarısız';
      videoCount.textContent = 'Güncelleme başarısız';
    });
}

updateStatsFromFile();
