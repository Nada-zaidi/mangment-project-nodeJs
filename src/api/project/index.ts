export default (app) => {
  app.post(
    `/tenant/:tenantId/project`,
    require('./projectCreate').default,
  );
  app.put(
    `/tenant/:tenantId/project/:id`,
    require('./projectUpdate').default,
  );
  app.delete(
    `/tenant/:tenantId/project`,
    require('./projectDestroy').default,
  );
  app.get(
    `/tenant/:tenantId/project/autocomplete`,
    require('./projectAutocomplete').default,
  );
  app.get(
    `/tenant/:tenantId/project`,
    require('./projectList').default,
  );
  app.get(
    `/tenant/:tenantId/project/:id`,
    require('./projectFind').default,
  );
};
