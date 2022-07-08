import fetch from "isomorphic-unfetch";

const throwError = ({ message, code }) => {
  const error = new Error(`${message}`);
  error.code = code;
  throw error;
};

const handleResponse = async (res) => {
  const { success, result, errors } = await res.json();
  if (!success) throwError(errors[0]);
  return result ?? success;
};

export default function CloudflareKV({ accountId, token, namespaceId }) {
  const baseUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}`;
  const keyUrl = (key = "") => `${baseUrl}/values/${key}`;

  const fetchOptions = (opts = {}, props) => ({
    ...opts,
    headers: {
      ...opts.headers,
      Authorization: `Bearer ${token}`,
    },
    ...props,
  });

  const get = async (key, opts) => {
    const response = await fetch(keyUrl(key), fetchOptions(opts));
    if (response.status === 404) return undefined;
    return response.json();
  };

  const listAll = async (limit = "", cursor = "", prefix = "", opts) => {
    const searchParams = new URLSearchParams({ limit, cursor, prefix });
    return await fetch(`${baseUrl}/keys?${searchParams.toString()}`, fetchOptions(opts)).then(
      handleResponse
    );
  };

  const set = async (key, value, ttl = "", opts) => {
    const searchParams = new URLSearchParams({ expiration_ttl: `${ttl / 1000}` });

    return await fetch(
      `${keyUrl(key)}?${searchParams.toString()}`,
      fetchOptions(opts, {
        body: typeof value === "string" ? value : JSON.stringify(value),
        method: "PUT",
      })
    ).then(handleResponse);
  };

  const _delete = async (key, opts) => {
    return await fetch(keyUrl(key), fetchOptions(opts, { method: "DELETE" })).then(handleResponse);
  };

  const bulkDelete = async (keys, opts) => {
    return await fetch(
      `${baseUrl}/bulk`,
      fetchOptions(
        {
          ...opts,
          headers: {
            "Content-Type": "application/json",
          },
        },
        {
          body: typeof keys === "string" ? keys : JSON.stringify(keys),
          method: "DELETE",
        }
      )
    ).then(handleResponse);
  };

  return { get, listAll, set, delete: _delete, bulkDelete };
}
