// ORTAK FONKSİYONLAR
// Bu dosya hem admin_panel/index.html (kurulum + panel) hem de
// admin_panel/giris/index.html (giriş) sayfaları tarafından kullanılır.
// Şifreleme, GitHub API ve yardımcı fonksiyonlar burada, tek yerde tutulur.

var VAULT_KEY = 'maseidtv_admin_vault';       // localStorage: şifrelenmiş GitHub bilgileri (kalıcı)
var SESSION_KEY = 'maseidtv_admin_session';   // sessionStorage: bu sekmede açık oturum (sekme kapanınca silinir)

var creds = null; // bellekte: { repo, branch, token } (panel sayfasında kullanılır)

function $(id) { return document.getElementById(id); }

function ab2base64(bytes) {
	var binary = '';
	for (var i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
	return btoa(binary);
}

function base642ab(base64) {
	var binary = atob(base64);
	var bytes = new Uint8Array(binary.length);
	for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return bytes;
}

async function deriveKey(password, saltBytes) {
	var passKey = await crypto.subtle.importKey(
		'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']
	);
	return crypto.subtle.deriveKey(
		{ name: 'PBKDF2', salt: saltBytes, iterations: 100000, hash: 'SHA-256' },
		passKey,
		{ name: 'AES-GCM', length: 256 },
		false,
		['encrypt', 'decrypt']
	);
}

async function encryptVault(password, dataObj) {
	var salt = crypto.getRandomValues(new Uint8Array(16));
	var iv = crypto.getRandomValues(new Uint8Array(12));
	var key = await deriveKey(password, salt);
	var plaintext = new TextEncoder().encode(JSON.stringify(dataObj));
	var ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, plaintext);
	return {
		salt: ab2base64(salt),
		iv: ab2base64(iv),
		data: ab2base64(new Uint8Array(ciphertext))
	};
}

async function decryptVault(password, vault) {
	var salt = base642ab(vault.salt);
	var iv = base642ab(vault.iv);
	var ciphertext = base642ab(vault.data);
	var key = await deriveKey(password, salt);
	var plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, ciphertext);
	return JSON.parse(new TextDecoder().decode(plainBuf));
}

function utf8ToBase64(str) {
	return btoa(unescape(encodeURIComponent(str)));
}

function base64ToUtf8(b64) {
	var binary = atob(b64.replace(/\n/g, ''));
	var bytes = new Uint8Array(binary.length);
	for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return new TextDecoder('utf-8').decode(bytes);
}

// Bir YouTube linkinden veya doğrudan ID'den video ID'sini çıkarır
function extractVideoId(input) {
	input = (input || '').trim();
	if (!input) return '';
	if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;
	var patterns = [
		/(?:youtube\.com\/watch\?v=|youtube\.com\/live\/|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/
	];
	for (var i = 0; i < patterns.length; i++) {
		var m = input.match(patterns[i]);
		if (m) return m[1];
	}
	return input;
}

// GitHub'daki bir dosyayı oluşturur veya günceller (dosya yoksa otomatik oluşturur)
async function githubUpdateFile(path, content, message) {
	var apiUrl = 'https://api.github.com/repos/' + creds.repo + '/contents/' + path;
	var sha = null;

	var getRes = await fetch(apiUrl + '?ref=' + encodeURIComponent(creds.branch), {
		headers: { 'Authorization': 'token ' + creds.token, 'Accept': 'application/vnd.github+json' }
	});

	if (getRes.ok) {
		var fileData = await getRes.json();
		sha = fileData.sha;
	} else if (getRes.status !== 404) {
		throw new Error('Dosya bilgisi alınamadı (HTTP ' + getRes.status + '). Depo/branch/token izinlerini kontrol edin.');
	}

	var body = { message: message, content: utf8ToBase64(content), branch: creds.branch };
	if (sha) body.sha = sha;

	var putRes = await fetch(apiUrl, {
		method: 'PUT',
		headers: {
			'Authorization': 'token ' + creds.token,
			'Accept': 'application/vnd.github+json',
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(body)
	});

	if (!putRes.ok) {
		var errBody = await putRes.json().catch(function () { return {}; });
		throw new Error('Güncelleme başarısız (HTTP ' + putRes.status + '). ' + (errBody.message || ''));
	}
}

// GitHub'dan bir dosyanın mevcut içeriğini okur (yoksa boş döner)
async function githubReadFile(path) {
	try {
		var apiUrl = 'https://api.github.com/repos/' + creds.repo + '/contents/' + path;
		var res = await fetch(apiUrl + '?ref=' + encodeURIComponent(creds.branch), {
			headers: { 'Authorization': 'token ' + creds.token, 'Accept': 'application/vnd.github+json' }
		});
		if (!res.ok) return '';
		var fileData = await res.json();
		return base64ToUtf8(fileData.content || '').trim();
	} catch (e) {
		return '';
	}
}

// Giriş sayfası şifreyi doğruladıktan sonra, bilgileri bu sekme için sessionStorage'a kaydeder.
// Böylece panel sayfasına yönlendirilince tekrar şifre sormaya gerek kalmaz.
// Not: localStorage'daki VAULT_KEY hâlâ şifreli (AES-GCM); burada sadece o an
// açılmış oturumun bilgisi, sekme kapanınca otomatik silinecek şekilde tutulur.
function saveSession(credsObj) {
	sessionStorage.setItem(SESSION_KEY, JSON.stringify(credsObj));
}

// Bu sekmede açık bir oturum var mı bakar, varsa creds nesnesini döner, yoksa null
function loadSession() {
	try {
		var raw = sessionStorage.getItem(SESSION_KEY);
		return raw ? JSON.parse(raw) : null;
	} catch (e) {
		return null;
	}
}

function clearSession() {
	sessionStorage.removeItem(SESSION_KEY);
}
