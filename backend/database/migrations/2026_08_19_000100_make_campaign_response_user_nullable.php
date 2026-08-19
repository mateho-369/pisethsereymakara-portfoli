<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Open questions and photo requests can now be answered without an account.
 *
 * A guest submission is stored with a NULL user_id: no account, no name,
 * nothing traceable back to a person. Polls stay login-required, so the
 * one-response-per-account unique index still does its job for signed-in
 * users — MySQL treats each NULL as distinct, so guests each get their own
 * anonymous row instead of colliding with each other.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('campaign_responses', function (Blueprint $table): void {
            $table->foreignId('user_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        // Guest rows have no account the constraint could point at again.
        DB::table('campaign_responses')->whereNull('user_id')->delete();

        Schema::table('campaign_responses', function (Blueprint $table): void {
            $table->foreignId('user_id')->nullable(false)->change();
        });
    }
};
