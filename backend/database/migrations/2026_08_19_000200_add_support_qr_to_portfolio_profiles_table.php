<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('portfolio_profiles', function (Blueprint $table): void {
            $table->text('support_qr_url')->nullable()->after('social_links');
            $table->text('support_caption')->nullable()->after('support_qr_url');
        });
    }

    public function down(): void
    {
        Schema::table('portfolio_profiles', function (Blueprint $table): void {
            $table->dropColumn(['support_qr_url', 'support_caption']);
        });
    }
};
