<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('portfolio_settings', function (Blueprint $table): void {
            $table->id();
            $table->string('key', 120)->unique();
            $table->longText('value')->nullable();
            $table->string('group', 60)->default('general')->index();
            $table->string('type', 20)->default('text');
            $table->string('label', 160)->default('');
            $table->string('hint', 255)->default('');
            $table->unsignedInteger('sort_order')->default(0);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('portfolio_settings');
    }
};
