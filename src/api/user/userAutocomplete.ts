import PermissionChecker from '../../services/user/permissionChecker';
import ApiResponseHandler from '../apiResponseHandler';
import Permissions from '../../security/permissions';
import UserController from '../../Controller/userController';

export default async (req, res) => {
  try {
    new PermissionChecker(req).validateHas(
      Permissions.values.userAutocomplete,
    );

    const payload = await UserController.findAllAutocomplete(
      req.query.query,
      req.query.limit,
      req,
    );

    await ApiResponseHandler.success(req, res, payload);
  } catch (error) {
    await ApiResponseHandler.error(req, res, error);
  }
};
