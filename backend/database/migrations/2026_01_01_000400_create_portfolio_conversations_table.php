<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void { Schema::create('portfolio_conversations', function (Blueprint $table): void { $table->id(); $table->string('visitor_id')->unique(); $table->string('visitor_name'); $table->string('visitor_email'); $table->text('avatar_url')->nullable(); $table->string('status', 20)->default('open')->index(); $table->unsignedInteger('unread_count')->default(0); $table->timestampTz('last_message_at')->useCurrent()->index(); }); }
    public function down(): void { Schema::dropIfExists('portfolio_conversations'); }
};
