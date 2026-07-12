// KURULUM SAYFASI (admin_panel/index.html)
// Ortak fonksiyonlar (şifreleme, GitHub API, $ vb.) admin-core.js içindedir,
// bu dosyadan önce yüklenmiş olmalıdır.
// Giriş ekranı: admin_panel/giris/index.html
// Panel ekranı: admin_panel/panel/index.html

// Sayfa yüklendiğinde: kurulum zaten yapılmışsa bu sayfada iş yok, uygun yere yönlendir
window.addEventListener('DOMContentLoaded', function () {
	var saved = localStorage.getItem(VAULT_KEY);
	if (!saved) return; // kurulum yapılmamış -> setupView zaten görünür durumda, burada kal

	// Kurulum zaten yapılmış: bu sekmede açık oturum varsa panele, yoksa girişe gönder
	if (loadSession()) {
		window.location.href = 'panel/index.html';
	} else {
		window.location.href = 'giris/index.html';
	}
});

// KURULUM
$('setupBtn').addEventListener('click', async function () {
	var repo = $('s-repo').value.trim();
	var branch = $('s-branch').value.trim() || 'main';
	var token = $('s-token').value.trim();
	var pass1 = $('s-pass1').value;
	var pass2 = $('s-pass2').value;
	var sonuc = $('setupSonuc');

	if (!repo || !token || !pass1) {
		sonuc.textContent = 'Lütfen tüm alanları doldurun.';
		sonuc.style.color = '#FF6B6B';
		return;
	}
	if (pass1 !== pass2) {
		sonuc.textContent = 'Şifreler eşleşmiyor.';
		sonuc.style.color = '#FF6B6B';
		return;
	}
	if (pass1.length < 6) {
		sonuc.textContent = 'Şifre en az 6 karakter olmalı.';
		sonuc.style.color = '#FF6B6B';
		return;
	}

	sonuc.textContent = 'Kuruluyor...';
	sonuc.style.color = '#FFFFFF';

	try {
		var vault = await encryptVault(pass1, { repo: repo, branch: branch, token: token });
		localStorage.setItem(VAULT_KEY, JSON.stringify(vault));
		creds = { repo: repo, branch: branch, token: token };
		saveSession(creds);
		// Kurulum tamamlandı -> doğrudan panele geç
		window.location.href = 'panel/index.html';
	} catch (err) {
		sonuc.textContent = 'Kurulum başarısız: ' + err.message;
		sonuc.style.color = '#FF0000';
		console.error(err);
	}
});
