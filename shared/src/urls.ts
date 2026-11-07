const TWO_GIS_HOSTS = ['2gis.kg', '2gis.ru', '2gis.kz', 'go.2gis.com', '2gis.com'];

export function isTwoGisUrl(value: string): boolean {
  try {
    const { protocol, hostname } = new URL(value);
    return protocol === 'https:' && TWO_GIS_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}
