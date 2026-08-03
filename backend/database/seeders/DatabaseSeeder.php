<?php

namespace Database\Seeders;

use App\Models\PortfolioFavorite;
use App\Models\PortfolioMedia;
use App\Models\PortfolioProfile;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(['email' => env('ADMIN_EMAIL', 'portfolio.owner@example.com')], ['name' => env('ADMIN_NAME', 'Dara Sovann'), 'password' => Hash::make(env('ADMIN_PASSWORD', 'peaceful123')), 'role' => 'admin', 'email_verified_at' => now()]);
        PortfolioProfile::updateOrCreate(['id' => 1], ['display_name' => 'Dara Sovann', 'role_title' => 'Creator, developer, and collector of quiet moments', 'location' => 'Phnom Penh · Cambodia', 'bio' => 'I build thoughtful digital things and make photographs when the light asks me to pause. This space is a living field journal—a home for small experiments, long walks, kind ideas, and the moments between destinations.', 'quote' => 'I have no enemies. There is no one I need to hurt.', 'email' => env('ADMIN_EMAIL', 'portfolio.owner@example.com'), 'avatar_url' => 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=1200', 'social_links' => ['github' => 'https://github.com', 'instagram' => 'https://instagram.com', 'email' => 'mailto:'.env('ADMIN_EMAIL', 'portfolio.owner@example.com')]]);
        $favorites = [['Early light','The soft hour when the day has not yet decided what it will become.','leaf'],['Slow photography','Waiting long enough for an ordinary scene to reveal its quiet beauty.','camera'],['Warm coffee','A small daily ritual, best shared beside an open window.','coffee'],['Useful code','Digital tools made carefully, with less noise and more humanity.','code'],['Unmarked paths','Walking without hurrying and letting curiosity choose the direction.','compass'],['Distant hills','Reminders that the world is wider, kinder, and worth exploring.','mountain'],['Gentle records','Music that makes a room feel warmer and time move a little slower.','music'],['Margin notes','Books with folded corners, pencilled thoughts, and a life of their own.','book']];
        foreach ($favorites as $index => [$title,$description,$icon]) PortfolioFavorite::updateOrCreate(['title' => $title], compact('description','icon') + ['sort_order' => $index + 1]);
        $media = [
            ['Morning over the meadow','First light moving slowly across a field still silver with dew.','Field Notes','259280/pexels-photo-259280.jpeg','landscape',true],
            ['A path toward blue','An old trail bending toward the hills after a quiet afternoon rain.','Wanderings','158607/cairn-fog-mystical-background-158607.jpeg','portrait',true],
            ['Still water, open sky','A fjord holding the color of evening without making a sound.','Horizons','417074/pexels-photo-417074.jpeg','landscape',false],
            ['Birch and silence','A pale forest holding the last cool breath of spring.','Quiet Places','957024/forest-trees-perspective-bright-957024.jpeg','portrait',false],
            ['Bread for the road','Warm bread, torn by hand, after a long morning outdoors.','Small Rituals','1775043/pexels-photo-1775043.jpeg','square',true],
            ['Rain at the window','A familiar room made new by the weather outside.','Home','459451/pexels-photo-459451.jpeg','portrait',false],
            ['Tea before words','Steam, a worn notebook, and a morning with nowhere else to be.','Small Rituals','1417945/pexels-photo-1417945.jpeg','square',false],
            ['Where the pines breathe','Cold air, resin, and a trail softened by fallen needles.','Wanderings','167684/pexels-photo-167684.jpeg','landscape',true],
        ];
        foreach ($media as $index => [$title,$description,$category,$image,$aspect,$favorite]) { $url = 'https://images.pexels.com/photos/'.$image.'?auto=compress&cs=tinysrgb&w=1600'; PortfolioMedia::updateOrCreate(['title' => $title], ['description'=>$description,'media_type'=>'photo','category'=>$category,'thumbnail_url'=>$url,'media_url'=>$url,'size_label'=>'2.4 MB','aspect_ratio'=>$aspect,'captured_at'=>now()->subDays($index * 13),'is_favorite'=>$favorite,'is_public'=>true]); }
    }
}
