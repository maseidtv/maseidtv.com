// PANEL SAYFASI (admin_panel/panel/index.html)
// Ortak fonksiyonlar (şifreleme, GitHub API, $ vb.) ../admin-core.js içindedir,
// bu dosyadan önce yüklenmiş olmalıdır.
// Kurulum ekranı: admin_panel/index.html
// Giriş ekranı: admin_panel/giris/index.html

// Galeri satırı ekler (link + başlık + sil butonu)
function addGaleriRow(link, baslik) {
	var row = document.createElement('div');
	row.className = 'galeri-satir';
	row.innerHTML =
		'<input type="text" class="galeri-link" placeholder="https://www.youtube.com/watch?v=XXXXXXXXXXX" value="' +
		escapeAttr(link || '') + '">' +
		'<input type="text" class="galeri-baslik" placeholder="Video başlığı" value="' +
		escapeAttr(baslik || '') + '">' +
		'<button type="button" class="galeri-sil">Sil</button>';
	row.querySelector('.galeri-sil').addEventListener('click', function () {
		row.remove();
	});
	$('videolarListe').appendChild(row);
}

function escapeAttr(str) {
	return String(str).replace(/"/g, '&quot;');
}

// Panel açıldığında mevcut abone/duyuru/canlı yayın/son video/galeri değerlerini alanlara doldurur
async function loadCurrentValues() {
	var abone = await githubReadFile('Abone.txt');
	var duyuru = await githubReadFile('Duyuru.txt');
	var canli = await githubReadFile('CanliYayin.txt');
	var sonvideo = await githubReadFile('SonVideolar.txt');
	var videolar = await githubReadFile('Videolar.txt');

	$('abone').value = abone || '';
	$('duyuru').value = duyuru || '';
	$('canli-link').value = canli || '';

	var sonLines = sonvideo ? sonvideo.split('\n').filter(function (l) { return l.trim(); }) : [];
	var sonParts = (sonLines[0] || '').split('|');
	$('sonvideo-link').value = sonParts[0] ? sonParts[0].trim() : '';
	$('sonvideo-baslik').value = sonParts[1] ? sonParts[1].trim() : '';

	$('videolarListe').innerHTML = '';
	var galeriLines = videolar ? videolar.split('\n').filter(function (l) { return l.trim(); }) : [];
	if (galeriLines.length === 0) {
		addGaleriRow('', '');
	} else {
		galeriLines.forEach(function (line) {
			var parts = line.split('|');
			addGaleriRow(parts[0] ? parts[0].trim() : '', parts[1] ? parts[1].trim() : '');
		});
	}

	var sosyal = await githubReadFile('Sosyal.txt');
	var sosyalMap = {};
	(sosyal ? sosyal.split('\n') : []).forEach(function (line) {
		var parts = line.split('|');
		var platform = parts[0] ? parts[0].trim().toLowerCase() : '';
		var url = parts[1] ? parts[1].trim() : '';
		if (platform) sosyalMap[platform] = url;
	});
	$('sosyal-instagram').value = sosyalMap['instagram'] || '';
	$('sosyal-discord').value = sosyalMap['discord'] || '';
	$('sosyal-tiktok').value = sosyalMap['tiktok'] || '';
	$('sosyal-twitter').value = sosyalMap['twitter'] || '';
	$('sosyal-twitch').value = sosyalMap['twitch'] || '';
}

// Tek bir alanı güncellerken kullanılan yardımcı fonksiyon
async function saveField(path, content, message, sonucEl) {
	if (!creds) {
		sonucEl.textContent = 'Oturum bulunamadı, lütfen yeniden giriş yapın.';
		sonucEl.style.color = '#FF0000';
		return;
	}
	sonucEl.textContent = 'Güncelleniyor...';
	sonucEl.style.color = '#FFFFFF';
	try {
		await githubUpdateFile(path, content, message);
		sonucEl.textContent = 'Başarılı! 1-2 dakika içinde sitede görünecek.';
		sonucEl.style.color = '#00FF00';
	} catch (err) {
		sonucEl.textContent = err.message;
		sonucEl.style.color = '#FF0000';
		console.error(err);
	}
}

// Sayfa yüklendiğinde: kurulum yoksa kurulum sayfasına, oturum yoksa giriş sayfasına yönlendir
window.addEventListener('DOMContentLoaded', function () {
	var saved = localStorage.getItem(VAULT_KEY);
	if (!saved) {
		window.location.href = '../index.html';
		return;
	}

	var session = loadSession();
	if (!session) {
		window.location.href = '../giris/index.html';
		return;
	}

	creds = session;
	$('repoBilgi').textContent = 'Bağlı depo: ' + creds.repo + ' (' + creds.branch + ')';
	loadCurrentValues();
});

// ÇIKIŞ YAP
$('logoutLink').addEventListener('click', function () {
	creds = null;
	clearSession();
	window.location.href = '../giris/index.html';
});

// PANEL SEKMELERİ (sayfa sayfa geçiş)
document.querySelectorAll('.panel-sekme-btn').forEach(function (btn) {
	btn.addEventListener('click', function () {
		var hedef = btn.getAttribute('data-sayfa');

		document.querySelectorAll('.panel-sekme-btn').forEach(function (b) {
			b.classList.remove('active');
		});
		btn.classList.add('active');

		document.querySelectorAll('.panel-sayfa').forEach(function (sayfa) {
			if (sayfa.getAttribute('data-sayfa') === hedef) {
				sayfa.classList.remove('hidden');
			} else {
				sayfa.classList.add('hidden');
			}
		});
	});
});

// ABONE SAYISINI GÜNCELLE
$('aboneBtn').addEventListener('click', function () {
	var abone = $('abone').value.trim();
	var sonuc = $('aboneSonuc');
	if (!abone) {
		sonuc.textContent = 'Lütfen yeni abone sayısını yazın.';
		sonuc.style.color = '#FF6B6B';
		return;
	}
	saveField('Abone.txt', abone, 'Abone sayısı güncellendi: ' + abone, sonuc);
});

// CANLI YAYINI GÜNCELLE
$('canliBtn').addEventListener('click', function () {
	var raw = $('canli-link').value.trim();
	var sonuc = $('canliSonuc');
	var id = raw ? extractVideoId(raw) : '';
	$('canli-link').value = id;
	saveField('CanliYayin.txt', id, id ? ('Canlı yayın güncellendi: ' + id) : 'Canlı yayın kaldırıldı', sonuc);
});

// CANLI YAYINI KALDIR
$('canliKaldirBtn').addEventListener('click', function () {
	$('canli-link').value = '';
	saveField('CanliYayin.txt', '', 'Canlı yayın kaldırıldı', $('canliSonuc'));
});

// DUYURUYU GÜNCELLE
$('duyuruBtn').addEventListener('click', function () {
	var metin = $('duyuru').value.trim();
	saveField('Duyuru.txt', metin, metin ? ('Duyuru güncellendi: ' + metin) : 'Duyuru kaldırıldı', $('duyuruSonuc'));
});

// DUYURUYU KALDIR
$('duyuruKaldirBtn').addEventListener('click', function () {
	$('duyuru').value = '';
	saveField('Duyuru.txt', '', 'Duyuru kaldırıldı', $('duyuruSonuc'));
});

// SON VİDEOYU GÜNCELLE
$('sonVideoBtn').addEventListener('click', function () {
	var sonuc = $('sonVideoSonuc');
	var link = $('sonvideo-link').value.trim();
	var baslik = $('sonvideo-baslik').value.trim();

	if (!link) {
		saveField('SonVideolar.txt', '', 'Son video kaldırıldı', sonuc);
		return;
	}

	var id = extractVideoId(link);
	$('sonvideo-link').value = id;
	saveField('SonVideolar.txt', id + '|' + baslik, 'Son video güncellendi: ' + id, sonuc);
});

// GALERİYE YENİ SATIR EKLE
$('videoEkleBtn').addEventListener('click', function () {
	addGaleriRow('', '');
});

// GALERİYİ KAYDET
$('videolarKaydetBtn').addEventListener('click', function () {
	var sonuc = $('videolarSonuc');
	var satirlar = document.querySelectorAll('#videolarListe .galeri-satir');
	var lines = [];

	satirlar.forEach(function (row) {
		var linkInput = row.querySelector('.galeri-link');
		var baslikInput = row.querySelector('.galeri-baslik');
		var link = linkInput.value.trim();
		if (!link) return;
		var id = extractVideoId(link);
		linkInput.value = id;
		var baslik = baslikInput.value.trim();
		lines.push(id + '|' + baslik);
	});

	saveField('Videolar.txt', lines.join('\n'), 'Videolar galerisi güncellendi', sonuc);
});

// SOSYAL MEDYA LİNKLERİNİ GÜNCELLE
$('sosyalBtn').addEventListener('click', function () {
	var sonuc = $('sosyalSonuc');
	var platformlar = [
		['instagram', $('sosyal-instagram').value.trim()],
		['discord', $('sosyal-discord').value.trim()],
		['tiktok', $('sosyal-tiktok').value.trim()],
		['twitter', $('sosyal-twitter').value.trim()],
		['twitch', $('sosyal-twitch').value.trim()]
	];
	var lines = platformlar
		.filter(function (p) { return p[1]; })
		.map(function (p) { return p[0] + '|' + p[1]; });

	saveField('Sosyal.txt', lines.join('\n'), 'Sosyal medya linkleri güncellendi', sonuc);
});
