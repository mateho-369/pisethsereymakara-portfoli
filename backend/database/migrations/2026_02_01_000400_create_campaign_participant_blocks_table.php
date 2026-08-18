<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Campaign blocking is deliberately its own table: it must never touch
        // users.blocked_at, which stays the site-wide chat pause.
        Schema::create('campaign_participant_blocks', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();

            // NULL means "blocked from every campaign, now and in future".
            $table->foreignId('campaign_id')->nullable()->constrained('campaigns')->cascadeOnDelete();

            $table->string('reason', 255)->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['user_id', 'campaign_id'], 'campaign_blocks_user_campaign_unique');
            $table->index('campaign_id', 'campaign_blocks_campaign_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('campaign_participant_blocks');
    }
};
