<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Throwable;

class SystemController extends Controller
{
    public function status(): JsonResponse
    {
        $checks = ['api' => true, 'database' => false, 'minio' => false];

        try {
            DB::select('select 1');
            $checks['database'] = true;
        } catch (Throwable $error) {
            report($error);
        }

        try {
            Storage::disk('s3')->files('health');
            $checks['minio'] = true;
        } catch (Throwable $error) {
            report($error);
        }

        $healthy = ! in_array(false, $checks, true);

        return response()->json([
            'ok' => $healthy,
            'service' => 'Field Notes Laravel API',
            'database_driver' => DB::getDriverName(),
            'checks' => $checks,
        ], $healthy ? 200 : 503);
    }
}
