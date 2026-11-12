<?php

declare(strict_types=1);

namespace Hafalanku\Api\Controller;

use Hafalanku\Api\Http\JsonResponse;

final class HealthController
{
    public function status(): never
    {
        JsonResponse::send([
            'status' => 'ok',
            'service' => 'hafalanku-api-phase2',
            'mvpMode' => 'static-frontend-only',
            'phpVersion' => PHP_VERSION,
        ]);
    }
}

