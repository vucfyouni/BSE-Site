<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: private, no-store');
header('X-Content-Type-Options: nosniff');
umask(0077);

function reply(int $status, array $body): never {
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}
function field(string $name, int $max): string {
    $value = $_POST[$name] ?? '';
    if (!is_string($value) || strlen($value) > $max) reply(400, ['error' => 'Please check the application fields and try again.']);
    return trim($value);
}
function privateDirectory(array $config): string {
    $web = realpath($_SERVER['DOCUMENT_ROOT'] ?? __DIR__);
    if ($web === false) throw new RuntimeException('Missing document root.');
    $web = rtrim($web, DIRECTORY_SEPARATOR);
    $accountWeb = $web;
    $home = null;
    if (preg_match('~^(.*)/public_html(?:/.*)?$~', $web, $match)) {
        $home = $match[1]; $accountWeb = $home . '/public_html';
    }
    $configured = $config['private_directory'] ?? '';
    $path = $configured !== '' ? $configured : ($home !== null ? $home . '/bse-private' : '');
    if ($path === '' || !str_starts_with($path, '/') || str_contains($path, '..')) throw new RuntimeException('Configure an absolute private storage directory outside the web root.');
    $parent = realpath(dirname($path));
    if ($parent === false) throw new RuntimeException('Private storage parent is missing.');
    $resolved = $parent . '/' . basename($path);
    foreach ([$web, $accountWeb] as $root) if ($resolved === $root || str_starts_with($resolved, $root . '/')) throw new RuntimeException('Private storage must be outside all web roots.');
    if (!is_dir($resolved) && !mkdir($resolved, 0700)) throw new RuntimeException('Private storage is not writable.');
    $resolved = realpath($resolved);
    if ($resolved === false) throw new RuntimeException('Private storage cannot be resolved.');
    foreach ([$web, $accountWeb] as $root) if ($resolved === $root || str_starts_with($resolved, $root . '/')) throw new RuntimeException('Unsafe private storage path.');
    if (!chmod($resolved, 0700) || !is_writable($resolved)) throw new RuntimeException('Private storage permissions could not be secured.');
    return $resolved;
}
function folder(string $path): void {
    if ((!is_dir($path) && !mkdir($path, 0700)) || !chmod($path, 0700)) throw new RuntimeException('Private folder could not be created.');
}
function rateLimit(string $storage, int $limit): void {
    folder($storage . '/rate-limits');
    // Use the connection address, never visitor-supplied forwarded headers.
    $key = hash('sha256', $_SERVER['REMOTE_ADDR'] ?? 'unknown');
    $handle = fopen($storage . '/rate-limits/' . $key . '.json', 'c+');
    if (!$handle || !flock($handle, LOCK_EX)) throw new RuntimeException('Rate limit is unavailable.');
    $state = json_decode(stream_get_contents($handle) ?: '{}', true);
    $hour = gmdate('Y-m-d-H');
    $count = ($state['hour'] ?? '') === $hour ? (int)($state['count'] ?? 0) : 0;
    if ($count >= $limit) {
        flock($handle, LOCK_UN); fclose($handle); header('Retry-After: 3600');
        reply(429, ['error' => 'Too many applications from this connection. Please try again later.']);
    }
    $json = json_encode(['hour' => $hour, 'count' => $count + 1]);
    rewind($handle); ftruncate($handle, 0); $written = fwrite($handle, $json);
    fflush($handle); flock($handle, LOCK_UN); fclose($handle);
    if ($written !== strlen($json)) throw new RuntimeException('Rate limit could not be saved.');
}
try {
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if (!in_array($method, ['GET', 'POST'], true)) { header('Allow: GET, POST'); reply(405, ['error' => 'Method not allowed.']); }
    if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 12 * 1024 * 1024) reply(413, ['error' => 'The portfolio must be 8 MB or smaller.']);
    $config = require __DIR__ . '/application-config.php';
    $storage = privateDirectory($config);
    folder($storage . '/sessions');
    ini_set('session.use_strict_mode', '1'); ini_set('session.use_only_cookies', '1');
    session_save_path($storage . '/sessions'); session_name('BSE_APPLICATION'); session_cache_limiter('');
    session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off', 'httponly' => true, 'samesite' => 'Strict']);
    if (!session_start()) throw new RuntimeException('Application session is unavailable.');
    $_SESSION['csrf_token'] ??= bin2hex(random_bytes(32));
    if ($method === 'GET') reply(200, ['csrfToken' => $_SESSION['csrf_token']]);
    if (!in_array($_SERVER['HTTP_ORIGIN'] ?? '', $config['allowed_origins'], true)) reply(403, ['error' => 'Please submit the form from the BSE website.']);
    $token = field('csrf_token', 128);
    if ($token === '' || !hash_equals($_SESSION['csrf_token'], $token)) reply(403, ['error' => 'Please reload the page and submit your application again.']);
    if (field('company_url', 200) !== '') reply(400, ['error' => 'The application could not be accepted.']);
    if (field('age_confirmed', 10) !== 'yes') reply(400, ['error' => 'You must confirm that you are at least 18 years old.']);
    $name = field('name', 100); $email = field('email', 200); $about = field('about', 4000); $url = field('portfolio_url', 500);
    $roles = $_POST['disciplines'] ?? [];
    if (!is_array($roles) || !$roles || count($roles) > 2) reply(400, ['error' => 'Choose photography, videography or both.']);
    foreach ($roles as $role) if (!is_string($role) || !in_array($role, ['photo', 'video'], true)) reply(400, ['error' => 'Choose photography, videography or both.']);
    if (strlen($name) < 2 || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($about) < 30) reply(400, ['error' => 'Include your name, a valid email and at least 30 characters about your work.']);
    if ($url !== '' && (!filter_var($url, FILTER_VALIDATE_URL) || strtolower(parse_url($url, PHP_URL_SCHEME) ?? '') !== 'https')) reply(400, ['error' => 'Portfolio links must start with https://.']);
    $file = $_FILES['portfolio'] ?? null;
    if (!$file || !is_array($file) || !is_int($file['error'] ?? null) || $file['error'] !== UPLOAD_ERR_OK) {
        $large = in_array($file['error'] ?? null, [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true);
        reply($large ? 413 : 400, ['error' => $large ? 'The portfolio must be 8 MB or smaller.' : 'Upload one PDF, JPEG, PNG or WebP portfolio.']);
    }
    if (!is_string($file['tmp_name'] ?? null) || !is_uploaded_file($file['tmp_name'])) reply(400, ['error' => 'The upload could not be verified.']);
    $size = filesize($file['tmp_name']);
    if ($size === false || $size === 0 || $size > 8 * 1024 * 1024) reply(413, ['error' => 'The portfolio must contain data and be 8 MB or smaller.']);
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
    $extensions = ['application/pdf' => 'pdf', 'image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
    if (!isset($extensions[$mime])) reply(415, ['error' => 'Please upload a PDF, JPEG, PNG or WebP portfolio.']);
    if ($mime !== 'application/pdf' && @getimagesize($file['tmp_name']) === false) reply(415, ['error' => 'The image file could not be read.']);
    rateLimit($storage, max(1, (int)($config['max_applications_per_ip_per_hour'] ?? 5)));
    folder($storage . '/applications');
    $id = gmdate('Ymd-His') . '-' . bin2hex(random_bytes(12));
    $directory = $storage . '/applications/' . $id; folder($directory);
    $target = $directory . '/portfolio.' . $extensions[$mime];
    $metadata = ['reference' => $id, 'submitted_at' => gmdate('c'), 'name' => $name, 'email' => $email, 'disciplines' => array_values(array_unique($roles)), 'about' => $about, 'portfolio_url' => $url, 'age_confirmed' => true, 'portfolio_file' => basename($target), 'original_filename' => preg_replace('/[\x00-\x1f\x7f]/', '', substr(basename((string)$file['name']), 0, 160)), 'file_type' => $mime, 'file_bytes' => $size, 'status' => 'pending'];
    try {
        if (!move_uploaded_file($file['tmp_name'], $target) || !chmod($target, 0600)) throw new RuntimeException('Portfolio could not be saved.');
        $json = json_encode($metadata, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
        if (file_put_contents($directory . '/application.json', $json, LOCK_EX) !== strlen($json) || !chmod($directory . '/application.json', 0600)) throw new RuntimeException('Application could not be saved.');
    } catch (Throwable $error) { @unlink($target); @unlink($directory . '/application.json'); @rmdir($directory); throw $error; }
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    reply(201, ['reference' => $id, 'message' => 'Your application was received. BSE will review your work and follow up using your contact email.']);
} catch (Throwable $error) {
    error_log('BSE application service: ' . $error->getMessage());
    reply(503, ['error' => 'Applications are temporarily unavailable. Please email blankslatelv@gmail.com.']);
}
