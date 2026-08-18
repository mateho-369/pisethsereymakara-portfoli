<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('campaigns', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();

            // Short, URL-safe share key used by /ask/{slug}.
            $table->string('slug', 60)->unique();

            $table->string('type', 20)->index();            // poll | question | photo
            $table->string('title', 160);
            $table->text('prompt')->nullable();
            $table->string('status', 20)->default('draft'); // draft | active | closed

            $table->dateTime('start_date')->nullable();
            $table->dateTime('end_date')->nullable();

            // after_vote | always | after_close — polls only.
            $table->string('poll_results_visibility', 20)->default('after_vote');

            // Whether a participant may replace their own answer later.
            $table->boolean('allow_updates')->default(false);

            // Optional, self-declared "where did you find this?" question.
            $table->boolean('ask_referral')->default(true);

            $table->timestamps();

            // The availability window is checked on every public request.
            $table->index(['status', 'start_date', 'end_date'], 'campaigns_availability_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('campaigns');
    }
};
