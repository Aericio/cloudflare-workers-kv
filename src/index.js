import fetch from "isomorphic-unfetch";

const throwError = ({ message, code }) => {
  const error = new Error(`${message}`);
  error.code = code;
  throw error;
};

export default function CloudflareKV({ accountId, key, namespaceId }) {
  const baseUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}`;
  const keyUrl = (key = "") => `${baseUrl}/values/${key}`;

  const fetchOptions = (opts = {}, props) => ({
    ...opts,
    headers: {
      ...opts.headers,
      Authorization: `Bearer ${key}`,
    },
    ...props,
  });

  const get = async (key, opts) => {
    const response = await fetch(keyUrl(key), fetchOptions(opts));
    if (response.status === 404) return undefined;
    return response.json();
  };

  const listAll = async (limit, cursor, prefix, opts) => {
    const searchParams = new URLSearchParams({ limit, cursor, prefix });
    const response = await fetch(`${baseUrl}/keys?${searchParams.toString()}`, fetchOptions(opts));
    if (response.status === 404) return undefined;
    return response.json();
  };

  const set = async (key, value, ttl, opts) => {
    const searchParams = new URLSearchParams(ttl ? { expiration_ttl: ttl } : {});

    const { success, errors } = await fetch(
      `${keyUrl(key)}?${searchParams.toString()}`,
      fetchOptions(opts, {
        body: typeof value === "string" ? value : JSON.stringify(value),
        method: "PUT",
      })
    ).then((res) => res.json());

    return success || throwError(errors[0]);
  };

  const _delete = async (key, opts) => {
    const { success, errors } = await fetch(keyUrl(key), fetchOptions(opts, { method: "DELETE" }));
    return success || throwError(errors[0]);
  };

  const bulkDelete = async (keys, opts) => {
    const { success, errors } = await fetch(
      `${baseUrl}/bulk`,
      fetchOptions(opts, {
        body: typeof keys === "string" ? keys : JSON.stringify(keys),
        method: "DELETE",
      })
    );
    return success || throwError(errors[0]);
  };

  return { get, listAll, set, delete: _delete, bulkDelete };
}
