<?php

namespace App\Support;

/**
 * The single source of truth for every editable string on the public site.
 *
 * Each entry keeps its shipped default, so the site never renders an empty box
 * when a key has not been customised yet. The admin dashboard renders straight
 * from this schema — add a field here and it appears in the editor with no
 * extra frontend work.
 */
class SiteContent
{
    /**
     * @return array<int, array{key:string,group:string,label:string,type:string,hint:string,sort_order:int,default:string}>
     */
    public static function schema(): array
    {
        $fields = [];
        $order = 0;

        foreach (self::definitions() as $group => $entries) {
            foreach ($entries as $key => [$label, $type, $default, $hint]) {
                $fields[] = [
                    'key' => $key,
                    'group' => $group,
                    'label' => $label,
                    'type' => $type,
                    'hint' => $hint,
                    'sort_order' => ++$order,
                    'default' => $default,
                ];
            }
        }

        return $fields;
    }

    /** @return array<string, string> */
    public static function defaultValues(): array
    {
        $values = [];

        foreach (self::schema() as $field) {
            $values[$field['key']] = $field['default'];
        }

        return $values;
    }

    /**
     * group => [ key => [label, type, default, hint] ]
     * type: text | textarea | url
     */
    private static function definitions(): array
    {
        return [
            'Brand & navigation' => [
                'brand.name' => ['Logo wordmark', 'text', 'Field Notes', 'Shown beside the sunrise mark in the header.'],
                'nav.home' => ['Nav · home', 'text', 'Home', ''],
                'nav.gallery' => ['Nav · gallery', 'text', 'Gallery', ''],
                'nav.favorites' => ['Nav · favorites', 'text', 'Favorites', ''],
                'nav.sign_in' => ['Nav · sign in', 'text', 'Sign in', ''],
                'nav.sign_up' => ['Nav · sign up button', 'text', 'Say hello', ''],
                'nav.inbox' => ['Nav · owner inbox', 'text', 'Inbox', ''],
                'nav.messages' => ['Nav · visitor messages', 'text', 'Messages', ''],
            ],

            'Home · hero' => [
                'home.hero.eyebrow' => ['Eyebrow', 'text', 'A quiet corner of the internet', 'Small line above your name.'],
                'home.hero.primary_cta' => ['Primary button', 'text', 'View gallery', ''],
                'home.hero.secondary_cta' => ['Secondary button', 'text', 'Say hello', ''],
            ],

            'Home · about' => [
                'home.about.eyebrow' => ['Eyebrow', 'text', '01 · About me', ''],
                'home.about.title_line_one' => ['Heading · first line', 'text', 'Making room for', ''],
                'home.about.title_line_two' => ['Heading · accent line', 'text', 'wonder.', 'Rendered in the fjord blue italic.'],
                'home.about.badge' => ['Photo badge', 'text', 'Here, now, grateful', ''],
            ],

            'Home · favorites' => [
                'home.favorites.eyebrow' => ['Eyebrow', 'text', '02 · Small joys', ''],
                'home.favorites.title' => ['Heading', 'text', 'Things I love', ''],
                'home.favorites.intro' => ['Intro paragraph', 'textarea', 'A collection of things that keep me curious, grounded, and moving gently through the world.', ''],
            ],

            'Home · gallery preview' => [
                'home.gallery.eyebrow' => ['Eyebrow', 'text', '03 · Field journal', ''],
                'home.gallery.title' => ['Heading', 'text', 'From the gallery', ''],
                'home.gallery.link' => ['Link label', 'text', 'View full gallery', ''],
            ],

            'Home · closing invitation' => [
                'home.cta.eyebrow' => ['Eyebrow', 'text', 'The door is open', ''],
                'home.cta.title' => ['Heading', 'text', "Let's exchange a few kind words.", ''],
                'home.cta.body' => ['Paragraph', 'textarea', 'No pitch, no pressure. Just a quiet conversation about ideas, images, or whatever is bringing you hope lately.', ''],
                'home.cta.button' => ['Button', 'text', 'Start a conversation', ''],
            ],

            'Gallery page' => [
                'gallery.eyebrow' => ['Eyebrow', 'text', 'The visual journal', ''],
                'gallery.title_line_one' => ['Heading · first line', 'text', 'A gallery of', ''],
                'gallery.title_line_two' => ['Heading · accent line', 'text', 'quiet moments.', ''],
                'gallery.intro' => ['Intro paragraph', 'textarea', 'Light, weather, overlooked paths, and the small details worth remembering.', ''],
                'gallery.empty' => ['Empty collection message', 'text', 'Nothing in this collection yet.', ''],
                'gallery.loading' => ['Loading label', 'text', 'Developing the photographs…', ''],
            ],

            'Chat page' => [
                'chat.eyebrow' => ['Eyebrow', 'text', 'Personal letters', ''],
                'chat.title_owner' => ['Heading · owner view', 'text', 'Your inbox', ''],
                'chat.title_visitor' => ['Heading · visitor view', 'text', 'A quiet conversation', ''],
                'chat.empty_title' => ['Empty thread heading', 'text', 'Begin with a simple hello.', ''],
                'chat.empty_body' => ['Empty thread paragraph', 'textarea', 'This is a small, private space for a thoughtful conversation.', ''],
                'chat.placeholder' => ['Composer placeholder', 'text', 'Write something kind…', ''],
                'chat.presence' => ['Presence line', 'text', 'Here in the quiet', ''],
                'chat.blocked_notice' => ['Message shown to a paused visitor', 'textarea', 'Messaging is paused for this account. You are still welcome to browse the journal.', ''],
                'chat.removed_message' => ['Placeholder for a removed message', 'text', 'This message was removed by the owner.', ''],
            ],

            'Sign in & sign up' => [
                'auth.signin.eyebrow' => ['Sign in · eyebrow', 'text', 'Good to see you again', ''],
                'auth.signin.title' => ['Sign in · heading', 'text', 'Welcome back', ''],
                'auth.signin.body' => ['Sign in · paragraph', 'textarea', 'Sign in to continue your quiet conversation.', ''],
                'auth.signup.eyebrow' => ['Sign up · eyebrow', 'text', 'Come in, stay awhile', ''],
                'auth.signup.title' => ['Sign up · heading', 'text', 'Say hello', ''],
                'auth.signup.body' => ['Sign up · paragraph', 'textarea', 'Create an account to chat and follow along.', ''],
            ],

            'Footer' => [
                'footer.tagline' => ['Tagline', 'text', 'Made slowly, shared warmly.', ''],
                'footer.copyright_suffix' => ['Line after the year', 'text', '', 'Optional note beside the copyright line.'],
            ],

            'Seasonal theme' => [
                'theme.active' => ['Active theme', 'text', 'default', 'Options: default, christmas, halloween, khmer-new-year, pchum-ben, bon-om-touk.'],
                'theme.greeting' => ['Seasonal greeting', 'text', '', 'Shown in the header when a seasonal theme is active.'],
                'theme.start_date' => ['Theme start date', 'text', '', 'Optional — when the theme auto-activates (YYYY-MM-DD).'],
                'theme.end_date' => ['Theme end date', 'text', '', 'Optional — when the theme auto-deactivates (YYYY-MM-DD).'],
            ],

            'Browser & 404' => [
                'meta.title' => ['Browser tab title', 'text', 'Field Notes — Piseth Serey Makara', ''],
                'meta.description' => ['Meta description', 'textarea', 'Field Notes — a peaceful personal portfolio, visual journal, and quiet place to connect.', ''],
                'notfound.eyebrow' => ['404 · eyebrow', 'text', 'A path not taken', ''],
                'notfound.body' => ['404 · paragraph', 'text', 'This trail seems to end here.', ''],
                'notfound.button' => ['404 · button', 'text', 'Return home', ''],
                'loading.default' => ['Default loading label', 'text', 'Gathering the morning light…', ''],
            ],
        ];
    }
}
