<?php

namespace App\Http\Requests;

use App\Models\Campaign;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateCampaignRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->isAdmin();
    }

    /**
     * A date-only end date means "through the end of that day". Without this,
     * picking today would close the campaign at midnight this morning.
     */
    protected function prepareForValidation(): void
    {
        $end = $this->input('end_date');

        if (is_string($end) && preg_match('/^\\d{4}-\\d{2}-\\d{2}$/', $end)) {
            $this->merge(['end_date' => $end.' 23:59:59']);
        }
    }

    public function rules(): array
    {
        /** @var Campaign|null $campaign */
        $campaign = $this->route('campaign');

        return [
            'title' => ['sometimes', 'required', 'string', 'max:160'],
            'prompt' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'status' => ['sometimes', Rule::in(Campaign::STATUSES)],
            'slug' => ['sometimes', 'required', 'string', 'min:3', 'max:60', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', Rule::unique('campaigns', 'slug')->ignore($campaign?->id)],
            'start_date' => ['sometimes', 'nullable', 'date'],
            'end_date' => ['sometimes', 'nullable', 'date'],
            'poll_results_visibility' => ['sometimes', Rule::in(Campaign::RESULT_VISIBILITIES)],
            'allow_updates' => ['sometimes', 'boolean'],
            'ask_referral' => ['sometimes', 'boolean'],
            'options' => ['sometimes', 'array', 'max:10'],
            'options.*.id' => ['nullable', 'integer'],
            'options.*.label' => ['required_with:options', 'string', 'max:120'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            /** @var Campaign|null $campaign */
            $campaign = $this->route('campaign');

            $start = $this->has('start_date') ? $this->date('start_date') : $campaign?->start_date;
            $end = $this->has('end_date') ? $this->date('end_date') : $campaign?->end_date;

            if ($start && $end && $end->lte($start)) {
                $validator->errors()->add('end_date', 'The end date must come after the start date.');
            }

            if ($campaign?->type === Campaign::TYPE_POLL && $this->has('options')) {
                $labels = array_filter(array_map(
                    fn ($option) => trim((string) ($option['label'] ?? '')),
                    (array) $this->input('options', []),
                ), fn ($label) => $label !== '');

                if (count($labels) < 2) {
                    $validator->errors()->add('options', 'A poll needs at least two options.');
                }
            }
        });
    }

    public function messages(): array
    {
        return ['slug.regex' => 'The share link may only use lowercase letters, numbers and hyphens.'];
    }
}
