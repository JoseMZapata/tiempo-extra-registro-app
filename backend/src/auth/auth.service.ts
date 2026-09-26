import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { User } from './entities/user.entity.js';

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.sembrarUsuarios();
  }

  async login(username: string, password: string) {
    const user = await this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.username = :username', { username: username.trim() })
      .getOne();
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Usuario o contraseña incorrectos');
    }

    const accessToken = await this.jwtService.signAsync({
      sub: String(user.id),
      username: user.username,
      isAdmin: user.isAdmin,
    });

    return {
      accessToken,
      tokenType: 'bearer',
      username: user.username,
      fullName: user.fullName,
      isAdmin: user.isAdmin,
    };
  }

  findById(id: number): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  list(): Promise<Omit<User, 'passwordHash'>[]> {
    return this.usersRepository.find({ order: { id: 'ASC' } });
  }

  async create(dto: CreateUserDto): Promise<Omit<User, 'passwordHash'>> {
    const username = dto.username.trim();
    const existe = await this.usersRepository.findOne({ where: { username } });
    if (existe) {
      throw new BadRequestException('El nombre de usuario ya existe');
    }

    const user = this.usersRepository.create({
      username,
      fullName: dto.fullName?.trim() || null,
      passwordHash: await bcrypt.hash(dto.password, 10),
      isAdmin: dto.isAdmin ?? false,
    });
    return this.sinPassword(await this.usersRepository.save(user));
  }

  async update(
    id: number,
    dto: UpdateUserDto,
    currentUser: User,
  ): Promise<Omit<User, 'passwordHash'>> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (user.id === currentUser.id && dto.isAdmin === false) {
      throw new BadRequestException(
        'No puedes quitarte tu propio rol de administrador',
      );
    }

    if (dto.username !== undefined && dto.username.trim() !== user.username) {
      const nuevo = dto.username.trim();
      const existente = await this.usersRepository.findOne({
        where: { username: nuevo },
      });
      if (existente && existente.id !== user.id) {
        throw new BadRequestException('El nombre de usuario ya existe');
      }
      user.username = nuevo;
    }

    if (dto.fullName !== undefined) {
      user.fullName = dto.fullName?.trim() || null;
    }

    if (dto.password !== undefined && dto.password.trim()) {
      if (dto.password.trim().length < 6) {
        throw new BadRequestException(
          'La contraseña debe tener al menos 6 caracteres',
        );
      }
      user.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    if (dto.isAdmin !== undefined && dto.isAdmin !== user.isAdmin) {
      if (user.isAdmin && !dto.isAdmin) {
        const administradores = await this.usersRepository.count({
          where: { isAdmin: true },
        });
        if (administradores <= 1) {
          throw new BadRequestException(
            'No puedes quitar el rol de administrador al último administrador',
          );
        }
      }
      user.isAdmin = dto.isAdmin;
    }

    return this.sinPassword(await this.usersRepository.save(user));
  }

  private sinPassword(user: User): Omit<User, 'passwordHash'> {
    const safe = { ...user } as Partial<User>;
    delete safe.passwordHash;
    return safe as Omit<User, 'passwordHash'>;
  }

  async remove(id: number, currentUser: User): Promise<{ message: string }> {
    if (id === currentUser.id) {
      throw new BadRequestException('No puedes eliminar tu propio usuario');
    }

    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (user.isAdmin) {
      const administradores = await this.usersRepository.count({
        where: { isAdmin: true },
      });
      if (administradores <= 1) {
        throw new BadRequestException(
          'No puedes eliminar el último administrador',
        );
      }
    }

    await this.usersRepository.remove(user);
    return { message: 'Usuario eliminado correctamente' };
  }

  private async sembrarUsuarios(): Promise<void> {
    const usuarios = [
      {
        username: this.configService.get<string>('ADMIN_USER', 'admin'),
        password: this.configService.get<string>(
          'ADMIN_PASSWORD',
          'Ecocable2026!',
        ),
        fullName: this.configService.get<string>('ADMIN_NAME', 'Administrador'),
        isAdmin: true,
      },
      {
        username: this.configService.get<string>('CLERK_USER', 'consulta'),
        password: this.configService.get<string>(
          'CLERK_PASSWORD',
          'Consulta2026!',
        ),
        fullName: this.configService.get<string>(
          'CLERK_NAME',
          'Usuario de Registro',
        ),
        isAdmin: false,
      },
    ];

    for (const datos of usuarios) {
      const existe = await this.usersRepository.findOne({
        where: { username: datos.username },
      });
      if (!existe) {
        await this.usersRepository.save(
          this.usersRepository.create({
            username: datos.username,
            fullName: datos.fullName,
            passwordHash: await bcrypt.hash(datos.password, 10),
            isAdmin: datos.isAdmin,
          }),
        );
      }
    }
  }
}
