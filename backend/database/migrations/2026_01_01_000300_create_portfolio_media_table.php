<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void { Schema::create('portfolio_media', function (Blueprint $table): void { $table->id(); $table->string('title'); $table->text('description')->default(''); $table->string('media_type', 20)->index(); $table->string('category')->index(); $table->text('thumbnail_url'); $table->text('media_url'); $table->string('size_label', 30); $table->string('aspect_ratio', 20)->default('landscape'); $table->timestampTz('captured_at')->useCurrent()->index(); $table->boolean('is_favorite')->default(false)->index(); $table->boolean('is_public')->default(true)->index(); }); }
    public function down(): void { Schema::dropIfExists('portfolio_media'); }
};
