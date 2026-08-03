<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void { Schema::create('portfolio_messages', function (Blueprint $table): void { $table->id(); $table->foreignId('conversation_id')->constrained('portfolio_conversations')->cascadeOnDelete(); $table->string('sender_id'); $table->string('sender_role', 20); $table->text('body')->default(''); $table->text('attachment_url')->nullable(); $table->timestampTz('created_at')->useCurrent()->index(); }); }
    public function down(): void { Schema::dropIfExists('portfolio_messages'); }
};
