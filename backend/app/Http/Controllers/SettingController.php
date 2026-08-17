<?php

namespace App\Http\Controllers;

use App\Models\PortfolioSetting;
use App\Support\SiteContent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    /** Public: every piece of site copy as a flat map, with defaults filled in. */
    public function index(): JsonResponse
    {
        return response()->json(array_merge(SiteContent::defaultValues(), PortfolioSetting::map()));
    }

    /** Admin: the full editable schema (label, group, type) for the dashboard. */
    public function adminIndex(): JsonResponse
    {
        $stored = PortfolioSetting::map();

        $fields = array_map(static function (array $field) use ($stored): array {
            $field['value'] = $stored[$field['key']] ?? $field['default'];

            return $field;
        }, SiteContent::schema());

        return response()->json(array_values($fields));
    }

    /** Admin: bulk upsert. Unknown keys are rejected so the schema stays truthful. */
    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'settings' => ['required', 'array', 'min:1'],
            'settings.*' => ['nullable', 'string', 'max:5000'],
        ]);

        $schema = collect(SiteContent::schema())->keyBy('key');

        foreach ($validated['settings'] as $key => $value) {
            $field = $schema->get($key);
            abort_if(! $field, 422, "Unknown setting: {$key}");

            PortfolioSetting::updateOrCreate(
                ['key' => $key],
                [
                    'value' => $value === null ? '' : $value,
                    'group' => $field['group'],
                    'type' => $field['type'],
                    'label' => $field['label'],
                    'hint' => $field['hint'] ?? '',
                    'sort_order' => $field['sort_order'],
                ]
            );
        }

        return $this->adminIndex();
    }

    /** Admin: put one key (or every key) back to its shipped default. */
    public function reset(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'key' => ['nullable', 'string', 'max:120'],
        ]);

        if (! empty($validated['key'])) {
            PortfolioSetting::query()->where('key', $validated['key'])->delete();
        } else {
            PortfolioSetting::query()->delete();
        }

        return $this->adminIndex();
    }
}
