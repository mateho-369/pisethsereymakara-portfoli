<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->timestamp('blocked_at')->nullable()->index();
            $table->string('blocked_reason', 255)->nullable();
        });

        Schema::table('portfolio_messages', function (Blueprint $table): void {
            $table->timestampTz('deleted_at')->nullable()->index();
            $table->string('deleted_by', 20)->nullable();
        });

        Schema::table('portfolio_media', function (Blueprint $table): void {
            $table->unsignedInteger('sort_order')->default(0)->index();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn(['blocked_at', 'blocked_reason']);
        });

        Schema::table('portfolio_messages', function (Blueprint $table): void {
            $table->dropColumn(['deleted_at', 'deleted_by']);
        });

        Schema::table('portfolio_media', function (Blueprint $table): void {
            $table->dropColumn('sort_order');
        });
    }
};
