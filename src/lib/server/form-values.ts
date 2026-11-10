export const formValues = async (request: Request) =>
	Object.fromEntries([...(await request.formData())].map(([name, value]) => [name, String(value)]));
