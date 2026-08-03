<?php

return [
    'default' => env('FILESYSTEM_DISK', 'local'),
    'disks' => [
        'local' => ['driver' => 'local', 'root' => storage_path('app/private'), 'serve' => true, 'throw' => false],
        'public' => ['driver' => 'local', 'root' => storage_path('app/public'), 'url' => env('APP_URL').'/storage', 'visibility' => 'public', 'throw' => false],
        's3' => ['driver' => 's3', 'key' => env('AWS_ACCESS_KEY_ID'), 'secret' => env('AWS_SECRET_ACCESS_KEY'), 'region' => env('AWS_DEFAULT_REGION', 'us-east-1'), 'bucket' => env('AWS_BUCKET', 'portfolio'), 'endpoint' => env('AWS_ENDPOINT', 'http://minio:9000'), 'use_path_style_endpoint' => true, 'throw' => true],
        'minio_public' => ['driver' => 's3', 'key' => env('AWS_ACCESS_KEY_ID'), 'secret' => env('AWS_SECRET_ACCESS_KEY'), 'region' => env('AWS_DEFAULT_REGION', 'us-east-1'), 'bucket' => env('AWS_BUCKET', 'portfolio'), 'endpoint' => env('MINIO_PUBLIC_ENDPOINT', 'http://localhost:9000'), 'url' => env('MINIO_PUBLIC_URL', 'http://localhost:9000/portfolio'), 'use_path_style_endpoint' => true, 'throw' => true],
    ],
    'links' => [public_path('storage') => storage_path('app/public')],
];
