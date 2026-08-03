<?php

use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function (): void {
    $this->comment('Make it slowly. Share it warmly.');
})->purpose('Display a quiet thought');
