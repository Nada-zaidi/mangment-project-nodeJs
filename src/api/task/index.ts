export default (app) => {
  app.post(
    `/tenant/:tenantId/task`,
    require('./taskCreate').default,
  );
  app.get(
    `/tenant/:tenantId/task/autocomplete`,
    require('./taskAutocomplete').default,
  );
  app.get(
    `/tenant/:tenantId/task/:id`,
    require('./taskFind').default,
  );
};
