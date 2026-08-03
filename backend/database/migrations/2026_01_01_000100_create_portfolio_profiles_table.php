<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void { Schema::create('portfolio_profiles', function (Blueprint $table): void { $table->id(); $table->string('display_name'); $table->string('role_title'); $table->string('location'); $table->text('bio'); $table->text('quote'); $table->string('email'); $table->text('avatar_url'); $table->json('social_links')->default('{}'); }); }
    public function down(): void { Schema::dropIfExists('portfolio_profiles'); }
};
