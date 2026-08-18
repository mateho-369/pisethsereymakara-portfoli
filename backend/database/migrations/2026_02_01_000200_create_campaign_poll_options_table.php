<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('campaign_poll_options', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('campaign_id')->constrained('campaigns')->cascadeOnDelete();
            $table->string('label', 120);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['campaign_id', 'sort_order'], 'poll_options_campaign_order_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('campaign_poll_options');
    }
};
