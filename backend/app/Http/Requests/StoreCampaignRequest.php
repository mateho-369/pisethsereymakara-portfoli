<?php

namespace App\Http\Requests;

use App\Models\Campaign;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreCampaignRequest extends FormRequest
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
        return [
            'type' => ['required', Rule::in(Campaign::TYPES)],
            'title' => ['required', 'string', 'max:160'],
            'prompt' => ['nullable', 'string', 'max:2000'],
            'status' => ['sometimes', Rule::in(Campaign::STATUSES)],
            'slug' => ['sometimes', 'nullable', 'string', 'min:3', 'max:60', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', 'unique:campaigns,slug'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date'],
            'poll_results_visibility' => ['sometimes', Rule::in(Campaign::RESULT_VISIBILITIES)],
            'allow_updates' => ['sometimes', 'boolean'],
            'ask_referral' => ['sometimes', 'boolean'],
            'options' => ['array', 'max:10'],
            'options.*' => ['string', 'max:120'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            // Compared here rather than with `after:start_date`, which misbehaves
            // when the start date is absent or null (both are optional).
            $start = $this->date('start_date');
            $end = $this->date('end_date');

            if ($start && $end && $end->lte($start)) {
                $validator->errors()->add('end_date', 'The end date must come after the start date.');
            }

            if ($this->input('type') !== Campaign::TYPE_POLL) {
                return;
            }

            $options = array_filter(array_map('trim', (array) $this->input('options', [])), fn ($label) => $label !== '');

            if (count($options) < 2) {
                $validator->errors()->add('options', 'A poll needs at least two options.');
            }
        });
    }

    public function messages(): array
    {
        return [
            'slug.regex' => 'The share link may only use lowercase letters, numbers and hyphens.',
            'end_date.after' => 'The end date must come after the start date.',
        ];
    }
}
