<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('campaign_responses', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('campaign_id')->constrained('campaigns')->cascadeOnDelete();

            // Every response is tied to an account the visitor knowingly signed in with.
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();

            $table->foreignId('poll_option_id')->nullable()->constrained('campaign_poll_options')->nullOnDelete();
            $table->text('answer_text')->nullable();

            // Object key only. Campaign photos are never handed out as public URLs.
            $table->string('photo_key', 500)->nullable();
            $table->string('photo_size_label', 30)->nullable();

            // pending | approved | rejected — photos start private and unapproved.
            $table->string('moderation_status', 20)->default('pending');

            // Set only when the owner deliberately copies a photo into the gallery.
            $table->foreignId('published_media_id')->nullable()->constrained('portfolio_media')->nullOnDelete();

            // Both self-declared and optional. Never derived from tracking.
            $table->string('referral_source', 40)->nullable();
            $table->string('declared_name', 80)->nullable();

            $table->timestamps();

            // One response per account per campaign, enforced by the database.
            $table->unique(['campaign_id', 'user_id'], 'campaign_responses_one_per_user_unique');
            $table->index(['campaign_id', 'poll_option_id'], 'campaign_responses_tally_index');
            $table->index(['campaign_id', 'moderation_status'], 'campaign_responses_moderation_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('campaign_responses');
    }
};
