// GİRİŞ SAYFASI (admin_panel/giris/index.html)
// Ortak fonksiyonlar (şifreleme, $ vb.) ../admin-core.js içindedir,
// bu dosyadan önce yüklenmiş olmalıdır.

window.addEventListener('DOMContentLoaded', function () {
	var saved = localStorage.getItem(VAULT_KEY);
	if (!saved) {
		// Henüz kurulum yapılmamış -> kurulum sayfasına yönlendir
		window.location.href = '../index.html';
		return;
	}
	// Bu sekmede zaten açık bir oturum varsa doğrudan panele dön
	if (loadSession()) {
		window.location.href = '../panel/index.html';
	}
});

// GİRİŞ
$('loginBtn').addEventListener('click', async function () {
	var password = $('l-pass').value;
	var sonuc = $('loginSonuc');

	if (!password) {
		sonuc.textContent = 'Lütfen şifrenizi girin.';
		sonuc.style.color = '#FF6B6B';
		return;
	}

	sonuc.textContent = 'Kontrol ediliyor...';
	sonuc.style.color = '#FFFFFF';

	try {
		var vault = JSON.parse(localStorage.getItem(VAULT_KEY));
		var data = await decryptVault(password, vault);
		saveSession(data);
		$('l-pass').value = '';
		sonuc.textContent = '';
		window.location.href = '../panel/index.html';
	} catch (err) {
		sonuc.textContent = 'Şifre yanlış.';
		sonuc.style.color = '#FF0000';
	}
});

// ŞİFREYİ SIFIRLA / YENİDEN KUR
$('resetLink').addEventListener('click', function () {
	if (confirm('Saklı GitHub bilgileri bu tarayıcıdan silinecek ve yeniden kurulum gerekecek. Emin misiniz?')) {
		localStorage.removeItem(VAULT_KEY);
		clearSession();
		window.location.href = '../index.html';
	}
});
