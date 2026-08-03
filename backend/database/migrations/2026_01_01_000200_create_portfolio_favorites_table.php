<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void { Schema::create('portfolio_favorites', function (Blueprint $table): void { $table->id(); $table->string('title'); $table->text('description'); $table->string('icon', 40); $table->unsignedInteger('sort_order')->default(0)->index(); }); }
    public function down(): void { Schema::dropIfExists('portfolio_favorites'); }
};
