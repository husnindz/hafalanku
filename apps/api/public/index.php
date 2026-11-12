<?php

declare(strict_types=1);

use Hafalanku\Api\Controller\HealthController;
use Hafalanku\Api\Http\JsonResponse;

require_once __DIR__ . '/../src/Http/JsonResponse.php';
require_once __DIR__ . '/../src/Controller/HealthController.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

if ($method === 'GET' && str_ends_with($path, '/health')) {
    (new HealthController())->status();
}

JsonResponse::send([
    'error' => 'not_found',
    'message' => 'Endpoint belum diaktifkan pada MVP. Riwayat tes tersimpan lokal di browser.',
], 404);

